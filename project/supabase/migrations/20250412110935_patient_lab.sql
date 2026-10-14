/*
  # Add subscription management system
  
  1. New Tables
    - `user_subscriptions`
      - Stores subscription information for each user
      - Tracks trial periods, Stripe customer IDs, and subscription status
      - Automatically creates trial subscriptions for new users
  
  2. Security
    - Enable RLS on user_subscriptions table
    - Add policy for users to view their own subscription data
  
  3. Automation
    - Trigger to create trial subscription on user signup
    - Function to handle trial subscription creation
*/

-- Create user_subscriptions table if it doesn't exist
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS user_subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users NOT NULL,
    stripe_customer_id text,
    stripe_subscription_id text,
    trial_end timestamptz NOT NULL,
    current_period_end timestamptz,
    cancel_at_period_end boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_id)
  );
EXCEPTION
  WHEN duplicate_table THEN
    NULL;
END $$;

-- Enable RLS if not already enabled
DO $$ BEGIN
  ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

-- Create or replace the policy
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view their own subscription" ON user_subscriptions;
  CREATE POLICY "Users can view their own subscription"
    ON user_subscriptions
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
END $$;

-- Create or replace the trial subscription function
CREATE OR REPLACE FUNCTION create_trial_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_subscriptions (
    user_id,
    trial_end
  ) VALUES (
    NEW.id,
    (CURRENT_TIMESTAMP + INTERVAL '29 days')
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Create the trigger if it doesn't exist
DO $$ BEGIN
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_trial_subscription();
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;