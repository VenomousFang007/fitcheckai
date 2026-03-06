import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { hmac } from "https://deno.land/x/crypto@v0.10.0/hmac.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Notification Dispatcher ───
async function sendNotification(userId: string, type: string, metadata?: Record<string, any>) {
    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const response = await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({ user_id: userId, type, metadata }),
        });
        const result = await response.json();
        console.log(`Notification (${type}) for user ${userId}:`, result);
    } catch (error: any) {
        // Notification failures should not break webhook processing
        console.error(`Failed to send notification (${type}):`, error.message);
    }
}

// Helper to get Supabase Admin client
function getSupabaseAdmin() {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    return createClient(supabaseUrl, supabaseServiceKey);
}

// Helper to reliably find user_id from various metadata or existing profile
async function getUserId(data: any, supabase: any): Promise<string | null> {
    // 1. Try metadata
    let userId = data.metadata?.user_id;
    if (!userId && data.metadata?.custom_fields) {
        const userField = data.metadata.custom_fields.find(
            (f: any) => f.variable_name === 'user_id'
        );
        userId = userField?.value;
    }
    if (userId) return userId;

    // 2. Try looking up by customer_code in user_subscriptions
    if (data.customer?.customer_code) {
        const { data: sub } = await supabase
            .from('user_subscriptions')
            .select('user_id')
            .eq('paystack_customer_code', data.customer.customer_code)
            .maybeSingle();
        if (sub?.user_id) return sub.user_id;

        // Try profiles table
        const { data: profile } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('paystack_customer_code', data.customer.customer_code)
            .maybeSingle();
        if (profile?.user_id) return profile.user_id;
    }

    // 3. Try looking up by email in auth.users
    if (data.customer?.email) {
        const { data: users, error } = await supabase.auth.admin.listUsers();
        if (!error && users?.users) {
            const match = users.users.find((u: any) => u.email === data.customer.email);
            if (match) return match.id;
        }
    }

    return null;
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
        if (!paystackSecretKey) throw new Error('Paystack secret key not configured');

        // 1. Verify Signature
        const signature = req.headers.get('x-paystack-signature');
        if (!signature) throw new Error('No signature provided');

        const rawBody = await req.text();
        const hash = hmac("sha512", paystackSecretKey, rawBody, "utf8", "hex");
        if (hash !== signature) {
            console.error('Invalid signature. Expected:', signature.substring(0, 10) + '...', 'Got:', String(hash).substring(0, 10) + '...');
            throw new Error('Invalid signature');
        }

        const event = JSON.parse(rawBody);
        console.log(`Received Paystack event: ${event.event}`, JSON.stringify({
            customer_email: event.data?.customer?.email,
            metadata_user_id: event.data?.metadata?.user_id,
            plan: event.data?.plan?.plan_code || event.data?.plan,
            amount: event.data?.amount,
        }));

        const supabase = getSupabaseAdmin();
        const data = event.data;

        // Route the event
        switch (event.event) {
            case 'subscription.create': {
                const userId = await getUserId(data, supabase);
                if (!userId) {
                    console.error('Cannot link subscription to user. Data:', JSON.stringify({
                        metadata: data.metadata,
                        customer: data.customer,
                    }));
                    throw new Error('Cannot link subscription to user');
                }

                const { error } = await supabase
                    .from('user_subscriptions')
                    .upsert({
                        user_id: userId,
                        paystack_customer_code: data.customer.customer_code,
                        paystack_subscription_code: data.subscription_code,
                        plan_code: data.plan.plan_code,
                        status: 'active',
                        current_period_start: data.createdAt,
                        current_period_end: data.next_payment_date,
                        cancel_at_period_end: false,
                        updated_at: new Date().toISOString()
                    });
                if (error) {
                    console.error('Upsert user_subscriptions error:', error);
                    throw error;
                }

                // Also update profile as fallback
                const { error: profileError } = await supabase.from('profiles').update({
                    paystack_customer_code: data.customer.customer_code,
                    subscription_tier: 'premium',
                    subscription_end_date: data.next_payment_date,
                }).eq('user_id', userId);
                if (profileError) console.error('Profile update error:', profileError);

                // Send welcome notification
                await sendNotification(userId, 'subscription_created', {
                    plan_code: data.plan.plan_code,
                });

                console.log(`Created subscription for user: ${userId}`);
                break;
            }

            case 'charge.success': {
                const userId = await getUserId(data, supabase);
                if (!userId) {
                    console.error('Cannot link charge to user. Data:', JSON.stringify({
                        metadata: data.metadata,
                        customer: data.customer,
                    }));
                    throw new Error('Cannot link charge to user');
                }

                // Calculate next payment date
                const planCode = data.plan?.plan_code || data.plan;
                const planInterval = data.plan?.interval;

                if (planCode) {
                    // This is a subscription charge
                    const nextPaymentDate = planInterval === 'annually'
                        ? new Date(new Date().setFullYear(new Date().getFullYear() + 1))
                        : new Date(new Date().setMonth(new Date().getMonth() + 1));

                    const { error } = await supabase
                        .from('user_subscriptions')
                        .upsert({
                            user_id: userId,
                            paystack_customer_code: data.customer.customer_code,
                            paystack_subscription_code: data.subscription_code || undefined,
                            plan_code: planCode,
                            status: 'active',
                            current_period_end: nextPaymentDate.toISOString(),
                            cancel_at_period_end: false,
                            updated_at: new Date().toISOString()
                        });
                    if (error) {
                        console.error('Upsert user_subscriptions error (charge):', error);
                        throw error;
                    }

                    // Also directly update profiles for immediate effect
                    const { error: profileError } = await supabase.from('profiles').update({
                        subscription_tier: 'premium',
                        paystack_customer_code: data.customer.customer_code,
                        subscription_end_date: nextPaymentDate.toISOString(),
                    }).eq('user_id', userId);
                    if (profileError) console.error('Profile update error:', profileError);
                } else {
                    // Standalone charge without plan — still set premium
                    const nextPaymentDate = new Date(new Date().setMonth(new Date().getMonth() + 1));
                    const { error } = await supabase.from('profiles').update({
                        subscription_tier: 'premium',
                        paystack_customer_code: data.customer.customer_code,
                        subscription_end_date: nextPaymentDate.toISOString(),
                    }).eq('user_id', userId);
                    if (error) {
                        console.error('Profile update error:', error);
                        throw error;
                    }
                }

                console.log(`Processed successful charge for user: ${userId}`);
                break;
            }

            case 'invoice.payment_failed': {
                const customerCode = data.customer.customer_code;
                const { data: sub } = await supabase
                    .from('user_subscriptions')
                    .select('user_id')
                    .eq('paystack_customer_code', customerCode)
                    .maybeSingle();

                if (sub) {
                    await supabase
                        .from('user_subscriptions')
                        .update({ status: 'past_due' })
                        .eq('user_id', sub.user_id);
                    // Send payment failed notification (push + email)
                    await sendNotification(sub.user_id, 'payment_failed', {
                        amount: data.amount,
                        customer_email: data.customer?.email,
                    });
                    console.log(`Marked subscription past_due for user: ${sub.user_id}`);
                }
                break;
            }

            case 'subscription.disable': {
                const subscriptionCode = data.subscription_code;
                const { data: sub } = await supabase
                    .from('user_subscriptions')
                    .select('user_id')
                    .eq('paystack_subscription_code', subscriptionCode)
                    .maybeSingle();

                if (sub) {
                    await supabase
                        .from('user_subscriptions')
                        .update({
                            cancel_at_period_end: true,
                        })
                        .eq('user_id', sub.user_id);
                    // Send cancellation notification (push + email)
                    await sendNotification(sub.user_id, 'subscription_disabled', {
                        subscription_code: data.subscription_code,
                    });
                    console.log(`Handled subscription disable for user: ${sub.user_id}`);
                }
                break;
            }

            default:
                console.log(`Ignored event: ${event.event}`);
        }

        return new Response(JSON.stringify({ status: "success" }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error: any) {
        console.error('Webhook payload error:', error.message || error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }
});
