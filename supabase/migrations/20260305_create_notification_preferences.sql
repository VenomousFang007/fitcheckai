-- ─── Notification Preferences Table ───────────────────────────────────────────
-- Stores per-user notification opt-ins and push token.
-- Referenced by: send-notification edge function, notification-cron, ProfilePage.tsx, App.tsx

CREATE TABLE IF NOT EXISTS public.notification_preferences (
    user_id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    enabled         boolean NOT NULL DEFAULT true,
    daily_style_reminders boolean NOT NULL DEFAULT true,
    streak_reminders      boolean NOT NULL DEFAULT true,
    weekly_summary        boolean NOT NULL DEFAULT true,
    push_token      text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at on any change
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notification_preferences_updated_at
    BEFORE UPDATE ON public.notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_preferences_updated_at();

-- ─── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can read their own preferences
CREATE POLICY "Users can view own notification preferences"
    ON public.notification_preferences FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert own notification preferences"
    ON public.notification_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences (toggle on/off, etc.)
CREATE POLICY "Users can update own notification preferences"
    ON public.notification_preferences FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Service role (Edge Functions) can do everything — upsert on new user creation
CREATE POLICY "Service role full access to notification preferences"
    ON public.notification_preferences FOR ALL
    USING (true)
    WITH CHECK (true);
