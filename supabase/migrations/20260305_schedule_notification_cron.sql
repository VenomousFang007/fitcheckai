-- ─── Enable pg_cron and pg_net extensions (required for scheduled HTTP calls) ──
-- Note: These may already be enabled on your Supabase project.
-- If this migration fails due to "already exists", that is safe to ignore.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ─── Schedule the daily notification cron job ─────────────────────────────────
-- Runs every day at 18:00 UTC.
-- Calls the notification-cron edge function using the service role key.
--
-- If you need to reschedule: SELECT cron.unschedule('fitcheck-daily-notifications'); 
-- then re-run this migration.

SELECT cron.schedule(
    'fitcheck-daily-notifications',
    '0 18 * * *',
    $$
        SELECT net.http_post(
            url     := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1) || '/functions/v1/notification-cron',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
            ),
            body    := '{}'::jsonb
        );
    $$
);
