-- Create the user_subscriptions table
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    paystack_customer_code TEXT,
    paystack_subscription_code TEXT,
    plan_code TEXT,
    status TEXT CHECK (status IN ('active', 'past_due', 'canceled', 'incomplete')),
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id)
);

-- Turn on Row Level Security
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see only their own subscription
CREATE POLICY "Users can view own subscription" 
    ON public.user_subscriptions 
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Policy: Service role can manage all subscriptions (this is implicit, but good to be clear)

-- Function to update the updated_at column automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to call the update_updated_at_column function
CREATE TRIGGER update_user_subscriptions_updated_at
    BEFORE UPDATE ON public.user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update the profiles table to compute or store the subscription_tier more robustly if needed.
-- But the application already checks `profiles.subscription_tier` and `subscription_end_date`.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS paystack_customer_code TEXT;

-- We can add a trigger on `user_subscriptions` to automatically update the `profiles` table to keep the frontend running as is.

CREATE OR REPLACE FUNCTION sync_subscription_to_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- If subscription is active and period end is in the future
    IF (NEW.status = 'active' AND NEW.current_period_end > now()) THEN
        UPDATE public.profiles
        SET subscription_tier = 'premium',
            subscription_end_date = NEW.current_period_end
        WHERE user_id = NEW.user_id;
    ELSE
        -- If it's past_due, canceled (and period ended), or incomplete
        UPDATE public.profiles
        SET subscription_tier = 'free',
            subscription_end_date = NEW.current_period_end
        WHERE user_id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER on_subscription_status_change
    AFTER INSERT OR UPDATE ON public.user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION sync_subscription_to_profile();
