import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getSupabaseAdmin() {
    return createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
}

// ─── Expo Push Notification Sender ───
async function sendExpoPush(pushToken: string, title: string, body: string, data?: Record<string, any>) {
    if (!pushToken || !pushToken.startsWith('ExponentPushToken')) {
        console.log('Invalid or missing Expo push token:', pushToken);
        return { success: false, error: 'invalid_token' };
    }

    try {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: pushToken,
                title,
                body,
                sound: 'default',
                data: data || {},
            }),
        });

        const result = await response.json();
        if (result.data?.status === 'error') {
            console.error('Expo push error:', result.data.message);
            return { success: false, error: result.data.message };
        }
        return { success: true };
    } catch (error: any) {
        console.error('Expo push send failed:', error.message);
        return { success: false, error: error.message };
    }
}

// ─── Resend Email Sender ───
async function sendEmail(to: string, subject: string, body: string) {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
        console.log('RESEND_API_KEY not configured, skipping email');
        return { success: false, error: 'no_api_key' };
    }

    const fromEmail = Deno.env.get('NOTIFICATION_FROM_EMAIL') || 'FitCheck AI <noreply@fitcheckai.com>';

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
                from: fromEmail,
                to: [to],
                subject,
                html: `
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                            <h1 style="color: white; margin: 0; font-size: 24px;">FitCheck AI</h1>
                        </div>
                        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                            <h2 style="color: #1f2937; margin-top: 0;">${subject}</h2>
                            <p style="color: #4b5563; line-height: 1.6;">${body}</p>
                        </div>
                        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
                            You're receiving this because you have a FitCheck AI account.
                        </p>
                    </div>
                `,
            }),
        });

        const result = await response.json();
        if (!response.ok) {
            console.error('Resend email error:', result);
            return { success: false, error: result.message || 'send_failed' };
        }
        return { success: true };
    } catch (error: any) {
        console.error('Email send failed:', error.message);
        return { success: false, error: error.message };
    }
}

// ─── Notification Templates ───
const NOTIFICATION_TEMPLATES: Record<string, { title: string; body: string; emailSubject?: string; emailBody?: string }> = {
    payment_failed: {
        title: '⚠️ Payment Failed',
        body: 'Your subscription payment couldn\'t be processed. Please update your payment method to keep your premium features.',
        emailSubject: 'Action Required: Payment Failed for FitCheck AI',
        emailBody: 'Your recent subscription payment could not be processed. Please log in to FitCheck AI and update your payment method to continue enjoying premium features. If you need any help, reply to this email.',
    },
    subscription_created: {
        title: '🎉 Welcome to Premium!',
        body: 'Your FitCheck AI premium subscription is now active. Enjoy unlimited style analysis and more!',
    },
    subscription_disabled: {
        title: '😢 Subscription Cancelled',
        body: 'Your premium subscription has been cancelled. You\'ll retain access until the end of your billing period.',
        emailSubject: 'Your FitCheck AI Subscription Has Been Cancelled',
        emailBody: 'Your premium subscription has been cancelled. You\'ll retain access to premium features until the end of your current billing period. We\'d love to have you back anytime!',
    },
    premium_expiry_warning: {
        title: '⏰ Premium Expiring Soon',
        body: 'Your FitCheck AI premium expires in 3 days. Renew now to keep your premium features!',
        emailSubject: 'Your FitCheck AI Premium Is Expiring Soon',
        emailBody: 'Your premium subscription will expire in 3 days. Renew now to continue enjoying unlimited style analysis, detailed insights, and exclusive features.',
    },
    renewal_reminder: {
        title: '🔔 Renewal Coming Up',
        body: 'Your FitCheck AI subscription will renew soon. No action needed!',
    },
    weekly_challenge: {
        title: '🏆 New Style Challenge!',
        body: 'A new weekly style challenge is waiting for you. Upload an outfit to start!',
    },
    streak_reminder: {
        title: '🔥 Keep Your Streak Alive!',
        body: 'Don\'t forget to upload today\'s outfit! Your style streak is counting on you.',
    },
    engagement_nudge: {
        title: '👋 We Miss You!',
        body: 'It\'s been a while! Upload an outfit to get fresh style insights.',
    },
};

// ─── Main Notification Dispatcher ───
interface NotificationRequest {
    user_id: string;
    type: string;
    channel?: 'push' | 'email' | 'both';
    custom_title?: string;
    custom_body?: string;
    metadata?: Record<string, any>;
}

async function dispatchNotification(req: NotificationRequest) {
    const supabase = getSupabaseAdmin();
    const template = NOTIFICATION_TEMPLATES[req.type];
    if (!template) throw new Error(`Unknown notification type: ${req.type}`);

    const title = req.custom_title || template.title;
    const body = req.custom_body || template.body;

    // Determine channel: billing events use 'both', engagement uses 'push'
    const billingTypes = ['payment_failed', 'subscription_disabled', 'premium_expiry_warning'];
    const channel = req.channel || (billingTypes.includes(req.type) ? 'both' : 'push');

    // 1. Log the notification
    const { data: notification, error: insertError } = await supabase
        .from('notifications')
        .insert({
            user_id: req.user_id,
            type: req.type,
            title,
            body,
            channel,
            status: 'pending',
            metadata: req.metadata || {},
        })
        .select('id')
        .single();

    if (insertError) {
        console.error('Failed to insert notification:', insertError);
        throw insertError;
    }

    // 2. Get user's push token and notification preferences
    const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('push_token, enabled, daily_style_reminders, streak_reminders')
        .eq('user_id', req.user_id)
        .maybeSingle();

    // 3. Check if notifications are enabled (billing always go through)
    const isBilling = billingTypes.includes(req.type) || req.type === 'subscription_created';
    if (!isBilling && prefs && !prefs.enabled) {
        console.log(`Notifications disabled for user ${req.user_id}, skipping non-billing notification`);
        await supabase.from('notifications').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', notification.id);
        return { success: true, skipped: true, reason: 'notifications_disabled' };
    }

    let pushResult = { success: false, error: 'not_attempted' };
    let emailResult = { success: false, error: 'not_attempted' };

    // 4. Send push notification
    if ((channel === 'push' || channel === 'both') && prefs?.push_token) {
        pushResult = await sendExpoPush(prefs.push_token, title, body, {
            notification_id: notification.id,
            type: req.type,
        });
    }

    // 5. Send email for billing-critical notifications
    if (channel === 'both' || channel === 'email') {
        // Get user email from auth
        const { data: { user } } = await supabase.auth.admin.getUserById(req.user_id);
        if (user?.email) {
            const emailSubject = template.emailSubject || title;
            const emailBody = template.emailBody || body;
            emailResult = await sendEmail(user.email, emailSubject, emailBody);
        } else {
            emailResult = { success: false, error: 'no_email_found' };
        }
    }

    // 6. Update notification status
    const finalStatus = (pushResult.success || emailResult.success) ? 'sent' : 'failed';
    await supabase.from('notifications').update({
        status: finalStatus,
        sent_at: new Date().toISOString(),
        metadata: {
            ...(req.metadata || {}),
            push_result: pushResult,
            email_result: emailResult,
        },
    }).eq('id', notification.id);

    console.log(`Notification ${notification.id} (${req.type}) → ${finalStatus}`, { pushResult, emailResult });
    return { success: finalStatus === 'sent', notification_id: notification.id, pushResult, emailResult };
}

// ─── HTTP Handler ───
serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const body: NotificationRequest = await req.json();

        if (!body.user_id || !body.type) {
            throw new Error('Missing required fields: user_id and type');
        }

        const result = await dispatchNotification(body);

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    } catch (error: any) {
        console.error('Send notification error:', error.message);
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }
});
