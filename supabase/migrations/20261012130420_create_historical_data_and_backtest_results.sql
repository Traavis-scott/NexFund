/*
# Create historical_data and backtest_results tables

1. New Tables
- `historical_data`: Stores user-uploaded trading data (OHLCV candles)
  - id (uuid, PK), user_id (uuid FK auth.users), instrument (text), timestamp (timestamptz),
    open_price, high_price, low_price, close_price, volume (decimal), created_at (timestamptz)
- `backtest_results`: Stores results of AI strategy backtests
  - id (uuid, PK), user_id (uuid FK auth.users), strategy_id (uuid), start_date, end_date (timestamptz),
    total_trades (int), win_rate, profit_loss, sharpe_ratio, max_drawdown (decimal),
    detailed_results (jsonb), created_at (timestamptz)

2. Security
- RLS enabled on both tables
- Owner-scoped CRUD: authenticated users can only access their own rows
- user_id defaults to auth.uid() so inserts work even when client omits it
*/

CREATE TABLE IF NOT EXISTS historical_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  instrument text NOT NULL,
  timestamp timestamptz NOT NULL,
  open_price decimal NOT NULL,
  high_price decimal NOT NULL,
  low_price decimal NOT NULL,
  close_price decimal NOT NULL,
  volume decimal NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS backtest_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy_id uuid NOT NULL,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  total_trades integer NOT NULL,
  win_rate decimal NOT NULL,
  profit_loss decimal NOT NULL,
  sharpe_ratio decimal NOT NULL,
  max_drawdown decimal NOT NULL,
  detailed_results jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE historical_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE backtest_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_historical_data" ON historical_data;
CREATE POLICY "select_own_historical_data" ON historical_data
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_historical_data" ON historical_data;
CREATE POLICY "insert_own_historical_data" ON historical_data
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_historical_data" ON historical_data;
CREATE POLICY "update_own_historical_data" ON historical_data
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_historical_data" ON historical_data;
CREATE POLICY "delete_own_historical_data" ON historical_data
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "select_own_backtest_results" ON backtest_results;
CREATE POLICY "select_own_backtest_results" ON backtest_results
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_backtest_results" ON backtest_results;
CREATE POLICY "insert_own_backtest_results" ON backtest_results
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_backtest_results" ON backtest_results;
CREATE POLICY "update_own_backtest_results" ON backtest_results
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_backtest_results" ON backtest_results;
CREATE POLICY "delete_own_backtest_results" ON backtest_results
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_historical_data_user_id ON historical_data(user_id);
CREATE INDEX IF NOT EXISTS idx_historical_data_timestamp ON historical_data(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_backtest_results_user_id ON backtest_results(user_id);
CREATE INDEX IF NOT EXISTS idx_backtest_results_created_at ON backtest_results(user_id, created_at DESC);
