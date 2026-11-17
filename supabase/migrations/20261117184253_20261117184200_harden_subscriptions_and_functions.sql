/*
# Harden subscription table and SECURITY DEFINER functions

## What changes and why

1. `user_subscriptions`
   - **Why**: the existing UPDATE policy let a signed-in user update *every*
     column of their own row, including `tier`, `stripe_customer_id`,
     `stripe_subscription_id`, `current_period_end` and
     `cancel_at_period_end`. That meant a user could flip their own `tier`
     to `pro` without paying.
   - **Fix**: remove the broad UPDATE policy and replace it with a narrow one
     that only allows updating `cancel_at_period_end` (so the user can
     request cancellation of their own subscription). All payment-related
     columns (`tier`, `stripe_customer_id`, `stripe_subscription_id`,
     `current_period_end`, `trial_end`) become writable only by the
     service role (used by the webhook and check-subscriptions edge
     functions), never by the client.
   - Remove the `anon`/`authenticated` UPDATE and DELETE grants on the
     table and grant only `SELECT` + `UPDATE (cancel_at_period_end)` to
     `authenticated`. The service role keeps full access.
   - Add a `DELETE` policy so users can delete their own subscription row
     (account deletion), with a matching grant.

2. `get_user_id_by_email`
   - **Why**: SECURITY DEFINER function callable by `anon` and
     `authenticated` via the Data API. Anyone could resolve an email to a
     user UUID.
   - **Fix**: REVOKE EXECUTE from PUBLIC/anon/authenticated. The edge
     function that needs it runs with the service role, which bypasses
     EXECUTE grants.

3. `create_trial_subscription`
   - **Why**: SECURITY DEFINER trigger function also callable by anon and
     authenticated through the REST API, which is unnecessary and unsafe.
   - **Fix**: REVOKE EXECUTE from PUBLIC/anon/authenticated. The function
     is only invoked by its trigger on `auth.users`, not by client code.

## Security changes
- Drop and recreate `user_subscriptions` UPDATE policy scoped to
  `cancel_at_period_end` only.
- Add `user_subscriptions` DELETE policy (own row only).
- Grant `SELECT, UPDATE (cancel_at_period_end), DELETE` to `authenticated`
  on `user_subscriptions`.
- REVOKE EXECUTE on `get_user_id_by_email(text)` and
  `create_trial_subscription()` from PUBLIC, anon and authenticated.
*/

-- 1. user_subscriptions: narrow UPDATE to cancel_at_period_end only

DROP POLICY IF EXISTS "update_own_subscription" ON user_subscriptions;

CREATE POLICY "update_own_subscription_cancel_only"
  ON user_subscriptions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Restrict column-level privileges: users may read everything but only
-- update cancel_at_period_end and delete their own row.
REVOKE UPDATE, DELETE ON user_subscriptions FROM anon, authenticated;
GRANT SELECT ON user_subscriptions TO authenticated;
GRANT UPDATE (cancel_at_period_end) ON user_subscriptions TO authenticated;
GRANT DELETE ON user_subscriptions TO authenticated;

-- Add DELETE policy so the column grant above is usable.
DROP POLICY IF EXISTS "delete_own_subscription" ON user_subscriptions;
CREATE POLICY "delete_own_subscription"
  ON user_subscriptions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 2. get_user_id_by_email: restrict execution to service role only

REVOKE EXECUTE ON FUNCTION get_user_id_by_email(text) FROM PUBLIC, anon, authenticated;

-- 3. create_trial_subscription: trigger function, not a public RPC

REVOKE EXECUTE ON FUNCTION create_trial_subscription() FROM PUBLIC, anon, authenticated;
