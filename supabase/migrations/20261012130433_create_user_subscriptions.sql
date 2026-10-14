/*
# Create user_subscriptions table with trial automation

1. New Tables
- `user_subscriptions`: Stores subscription state per user
  - id (uuid, PK), user_id (uuid FK auth.users, unique), stripe_customer_id (text),
    stripe_subscription_id (text), trial_end (timestamptz), current_period_end (timestamptz),
    cancel_at_period_end (boolean), tier (text default 'free'), created_at (timestamptz)

2. Security
- RLS enabled, owner-scoped SELECT and UPDATE

3. Automation
- Trigger on_auth_user_created calls create_trial_subscription() to auto-create a 29-day trial on signup
*/

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id text,
  stripe_subscription_id text,
  trial_end timestamptz NOT NULL,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  tier text DEFAULT 'free',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_subscription" ON user_subscriptions;
CREATE POLICY "select_own_subscription" ON user_subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_subscription" ON user_subscriptions;
CREATE POLICY "update_own_subscription" ON user_subscriptions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION create_trial_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_subscriptions (user_id, trial_end)
  VALUES (NEW.id, CURRENT_TIMESTAMP + INTERVAL '29 days')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_trial_subscription();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
