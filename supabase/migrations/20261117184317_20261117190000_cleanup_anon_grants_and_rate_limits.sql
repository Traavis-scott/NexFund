/*
# Clean up anon grants and add rate limiting table

## What changes and why

1. Remove `anon` grants on all three tables
   - **Why**: the app requires sign-in (has an auth screen), so the `anon`
     role should never reach `historical_data`, `backtest_results` or
     `user_subscriptions`. The RLS policies already block anon (they check
     `auth.uid()` which is null for anon), but the grants are unnecessary
     attack surface. Defense in depth: remove them.

2. Add `rate_limits` table
   - **Why**: edge-function rate limiting needs a durable store because
     each request may hit a fresh function instance and instances do not
     share memory. The Supabase database is the only durable store
     available.
   - Columns: `id`, `user_id`, `function_name`, `request_count`,
     `window_start`, `updated_at`.
   - RLS enabled, only the service role (used by edge functions) can read
     and write it. No client-facing grants or policies.

## Security changes
- REVOKE SELECT, INSERT, UPDATE, DELETE on `historical_data`,
  `backtest_results`, `user_subscriptions` FROM `anon`.
- Create `rate_limits` table with RLS enabled, service_role only.
*/

-- 1. Remove anon grants (app requires sign-in)

REVOKE SELECT, INSERT, UPDATE, DELETE ON historical_data FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON backtest_results FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON user_subscriptions FROM anon;

-- 2. Rate limiting table

CREATE TABLE IF NOT EXISTS rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  function_name text NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, function_name)
);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- No client grants or policies: only the service role (edge functions)
-- accesses this table, and the service role bypasses RLS.
REVOKE ALL ON rate_limits FROM anon, authenticated;
