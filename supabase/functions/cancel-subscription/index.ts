import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            throw new Error('Missing Authorization header');
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

        // Create client with the user's auth token
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } },
        });

        // Verify the user — must pass JWT explicitly in Edge Functions
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        if (userError || !user) {
            console.error('Auth error:', userError?.message);
            throw new Error('Unauthorized');
        }

        // Get user's active subscription
        const { data: sub, error: subError } = await supabase
            .from('user_subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (subError || !sub) {
            throw new Error('No active subscription found');
        }

        if (!sub.paystack_subscription_code) {
            throw new Error('No subscription code to cancel');
        }

        const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
        if (!paystackSecretKey) throw new Error('Paystack configuration error');

        // 1. Fetch subscription from Paystack to get the email_token
        const fetchResponse = await fetch(`https://api.paystack.co/subscription/${sub.paystack_subscription_code}`, {
            headers: {
                Authorization: `Bearer ${paystackSecretKey}`,
            },
        });

        const fetchData = await fetchResponse.json();
        if (!fetchData.status) {
            throw new Error(fetchData.message || 'Failed to fetch subscription details');
        }

        const emailToken = fetchData.data.email_token;

        // 2. Disable the subscription
        const disableResponse = await fetch('https://api.paystack.co/subscription/disable', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${paystackSecretKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                code: sub.paystack_subscription_code,
                token: emailToken,
            }),
        });

        const disableData = await disableResponse.json();
        if (!disableData.status) {
            throw new Error(disableData.message || 'Failed to disable subscription');
        }

        // 3. Mark as cancel_at_period_end in our DB
        // Initialize an admin client to update DB if RLS prevents user from updating user_subscriptions table directly
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

        await adminSupabase
            .from('user_subscriptions')
            .update({ cancel_at_period_end: true })
            .eq('id', sub.id);

        return new Response(JSON.stringify({ status: "success", message: "Subscription canceled" }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error: any) {
        console.error('Cancel subscription error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }
});
