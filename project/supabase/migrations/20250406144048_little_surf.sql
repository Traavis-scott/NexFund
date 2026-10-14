/*
  # Schéma initial pour la plateforme de trading

  1. Nouvelles Tables
    - `historical_data` : Données historiques de trading
      - `id` (uuid, clé primaire)
      - `user_id` (uuid, clé étrangère vers auth.users)
      - `instrument` (text, nom de l'instrument)
      - `timestamp` (timestamptz, horodatage)
      - `open_price` (decimal, prix d'ouverture)
      - `high_price` (decimal, prix le plus haut)
      - `low_price` (decimal, prix le plus bas)
      - `close_price` (decimal, prix de clôture)
      - `volume` (decimal, volume)
      - `created_at` (timestamptz, date de création)

    - `backtest_results` : Résultats des backtests
      - `id` (uuid, clé primaire)
      - `user_id` (uuid, clé étrangère vers auth.users)
      - `strategy_id` (uuid, identifiant de la stratégie)
      - `start_date` (timestamptz, début du backtest)
      - `end_date` (timestamptz, fin du backtest)
      - `total_trades` (integer, nombre total de trades)
      - `win_rate` (decimal, taux de réussite)
      - `profit_loss` (decimal, profit/perte)
      - `sharpe_ratio` (decimal, ratio de Sharpe)
      - `max_drawdown` (decimal, drawdown maximum)
      - `detailed_results` (jsonb, résultats détaillés)
      - `created_at` (timestamptz, date de création)

  2. Sécurité
    - RLS activé sur toutes les tables
    - Politiques pour permettre aux utilisateurs d'accéder uniquement à leurs données
*/

-- Table des données historiques
CREATE TABLE IF NOT EXISTS historical_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  instrument text NOT NULL,
  timestamp timestamptz NOT NULL,
  open_price decimal NOT NULL,
  high_price decimal NOT NULL,
  low_price decimal NOT NULL,
  close_price decimal NOT NULL,
  volume decimal NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Table des résultats de backtest
CREATE TABLE IF NOT EXISTS backtest_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
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

-- Activer RLS
ALTER TABLE historical_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE backtest_results ENABLE ROW LEVEL SECURITY;

-- Politiques pour historical_data
CREATE POLICY "Users can view their own historical data"
  ON historical_data
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own historical data"
  ON historical_data
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Politiques pour backtest_results
CREATE POLICY "Users can view their own backtest results"
  ON backtest_results
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own backtest results"
  ON backtest_results
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);