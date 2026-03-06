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

async function callSendNotification(userId: string, type: string, metadata?: Record<string, any>) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    try {
        await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({ user_id: userId, type, metadata }),
        });
    } catch (error: any) {
        console.error(`Cron notification failed (${type}) for ${userId}:`, error.message);
    }
}

// ─── Check for expiring premium subscriptions (3 days warning) ───
async function checkExpiringSubscriptions(supabase: any) {
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const today = new Date();

    const { data: expiring } = await supabase
        .from('user_subscriptions')
        .select('user_id')
        .eq('status', 'active')
        .eq('cancel_at_period_end', true)
        .gte('current_period_end', today.toISOString())
        .lte('current_period_end', threeDaysFromNow.toISOString());

    if (expiring && expiring.length > 0) {
        // Check we haven't already sent this notification today
        for (const sub of expiring) {
            const { data: existing } = await supabase
                .from('notifications')
                .select('id')
                .eq('user_id', sub.user_id)
                .eq('type', 'premium_expiry_warning')
                .gte('created_at', new Date(today.setHours(0, 0, 0, 0)).toISOString())
                .maybeSingle();

            if (!existing) {
                await callSendNotification(sub.user_id, 'premium_expiry_warning');
            }
        }
    }

    return expiring?.length || 0;
}

// ─── Check for weekly challenge reminders ───
async function checkWeeklyChallengeReminders(supabase: any) {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday

    // Send challenge reminders on Monday mornings
    if (dayOfWeek !== 1) return 0;

    // Get all users with active challenges that haven't been reminded today
    const { data: users } = await supabase
        .from('style_challenges')
        .select('user_id')
        .eq('primary_status', 'active')
        .gte('week_end', now.toISOString());

    if (!users || users.length === 0) return 0;

    // Deduplicate user IDs
    const uniqueUserIds = [...new Set(users.map((u: any) => u.user_id))];
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    let sent = 0;
    for (const userId of uniqueUserIds) {
        const { data: existing } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', userId)
            .eq('type', 'weekly_challenge')
            .gte('created_at', today.toISOString())
            .maybeSingle();

        if (!existing) {
            await callSendNotification(userId as string, 'weekly_challenge');
            sent++;
        }
    }

    return sent;
}

// ─── Check for streak reminders (users who haven't uploaded today) ───
async function checkStreakReminders(supabase: any) {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    // Only send streak reminders in the evening (after 17:00 UTC)
    if (now.getUTCHours() < 17) return 0;

    // Get users who have uploaded at least once in the past 7 days but NOT today
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Users with recent activity
    const { data: activeUsers } = await supabase
        .from('OutfitData')
        .select('user_id')
        .gte('created_at', sevenDaysAgo.toISOString())
        .not('user_id', 'is', null);

    if (!activeUsers || activeUsers.length === 0) return 0;

    const uniqueUserIds = [...new Set(activeUsers.map((u: any) => u.user_id))];

    let sent = 0;
    for (const userId of uniqueUserIds) {
        // Check if they uploaded today
        const { data: todayUpload } = await supabase
            .from('OutfitData')
            .select('id_uuid')
            .eq('user_id', userId)
            .gte('created_at', today.toISOString())
            .maybeSingle();

        if (todayUpload) continue; // Already uploaded today

        // Check we haven't sent a streak reminder today
        const { data: existing } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', userId)
            .eq('type', 'streak_reminder')
            .gte('created_at', today.toISOString())
            .maybeSingle();

        if (!existing) {
            // Check if user has streak reminders enabled
            const { data: prefs } = await supabase
                .from('notification_preferences')
                .select('streak_reminders, enabled')
                .eq('user_id', userId)
                .maybeSingle();

            if (prefs?.enabled !== false && prefs?.streak_reminders !== false) {
                await callSendNotification(userId as string, 'streak_reminder');
                sent++;
            }
        }
    }

    return sent;
}

// ─── Check for engagement nudges (users inactive > 5 days) ───
async function checkEngagementNudges(supabase: any) {
    const now = new Date();
    const fiveDaysAgo = new Date(now);
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    // Get users with their last outfit upload
    const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id');

    if (!profiles || profiles.length === 0) return 0;

    let sent = 0;
    for (const profile of profiles) {
        // Check last upload
        const { data: lastUpload } = await supabase
            .from('OutfitData')
            .select('created_at')
            .eq('user_id', profile.user_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (!lastUpload) continue;

        const lastUploadDate = new Date(lastUpload.created_at);

        // Only nudge if inactive 5-30 days (not brand new, not churned)
        if (lastUploadDate > fiveDaysAgo || lastUploadDate < thirtyDaysAgo) continue;

        // Don't send more than one nudge per week
        const oneWeekAgo = new Date(now);
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const { data: recentNudge } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', profile.user_id)
            .eq('type', 'engagement_nudge')
            .gte('created_at', oneWeekAgo.toISOString())
            .maybeSingle();

        if (!recentNudge) {
            await callSendNotification(profile.user_id, 'engagement_nudge');
            sent++;
        }
    }

    return sent;
}

// ─── Check for renewal reminders (7 days before auto-renewal) ───
async function checkRenewalReminders(supabase: any) {
    const now = new Date();
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const sixDaysFromNow = new Date(now);
    sixDaysFromNow.setDate(sixDaysFromNow.getDate() + 6);
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    // Find active, auto-renewing subscriptions expiring in ~7 days
    const { data: renewing } = await supabase
        .from('user_subscriptions')
        .select('user_id')
        .eq('status', 'active')
        .eq('cancel_at_period_end', false)
        .gte('current_period_end', sixDaysFromNow.toISOString())
        .lte('current_period_end', sevenDaysFromNow.toISOString());

    if (!renewing || renewing.length === 0) return 0;

    let sent = 0;
    for (const sub of renewing) {
        // De-dup: skip if already sent renewal_reminder today
        const { data: existing } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', sub.user_id)
            .eq('type', 'renewal_reminder')
            .gte('created_at', today.toISOString())
            .maybeSingle();

        if (!existing) {
            await callSendNotification(sub.user_id, 'renewal_reminder');
            sent++;
        }
    }

    return sent;
}

// ─── HTTP Handler ───
serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabase = getSupabaseAdmin();
        const results: Record<string, number> = {};

        results.expiring_subscriptions = await checkExpiringSubscriptions(supabase);
        results.renewal_reminders = await checkRenewalReminders(supabase);
        results.weekly_challenges = await checkWeeklyChallengeReminders(supabase);
        results.streak_reminders = await checkStreakReminders(supabase);
        results.engagement_nudges = await checkEngagementNudges(supabase);

        console.log('Notification cron results:', results);

        return new Response(JSON.stringify({ status: 'success', results }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    } catch (error: any) {
        console.error('Notification cron error:', error.message);
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
    }
});
