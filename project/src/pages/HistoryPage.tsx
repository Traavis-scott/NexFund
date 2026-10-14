import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Brain, TrendingUp, ArrowUpRight, ArrowDownRight, Trash2, RotateCcw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import toast from 'react-hot-toast';
import { HomeButton } from '../components/ui/HomeButton';

interface BacktestResult {
  id: string;
  strategy_id: string;
  start_date: string;
  end_date: string;
  total_trades: number;
  win_rate: number;
  profit_loss: number;
  sharpe_ratio: number;
  max_drawdown: number;
  detailed_results: {
    parameters: {
      lookback: number;
      threshold: number;
      stopLoss: number;
      takeProfit: number;
    };
    performance_data: Array<{
      date: string;
      value: number;
    }>;
  };
  created_at: string;
}

export function HistoryPage() {
  const { session } = useAuth();
  const [results, setResults] = useState<BacktestResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) {
      fetchResults(session.user.id);
    }
  }, [session]);

  const fetchResults = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('backtest_results')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResults(data as unknown as BacktestResult[]);
    } catch {
      toast.error('Erreur lors du chargement de l\'historique');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('backtest_results')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setResults(results.filter(result => result.id !== id));
      toast.success('Résultat supprimé avec succès');
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleRerun = async (result: BacktestResult) => {
    if (!session) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/train-model`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'X-User-Id': session.user.id,
        },
        body: JSON.stringify({
          strategyId: result.strategy_id,
          parameters: result.detailed_results.parameters
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Erreur');
      }
      toast.success('Réentraînement démarré avec succès');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors du réentraînement');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold mb-8">Historique des Entraînements</h1>

      <div className="grid gap-6">
        {results.map((result) => (
          <motion.div
            key={result.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-lg border border-border p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Brain className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">
                    Entraînement du {new Date(result.created_at).toLocaleDateString()}
                  </h3>
                  <p className="text-sm text-foreground/60">
                    {new Date(result.start_date).toLocaleDateString()} - {new Date(result.end_date).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleRerun(result)}
                  className="p-2 rounded-lg hover:bg-primary/10"
                  aria-label="Réexécuter"
                >
                  <RotateCcw className="h-5 w-5 text-primary" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleDelete(result.id)}
                  className="p-2 rounded-lg hover:bg-red-500/10"
                  aria-label="Supprimer"
                >
                  <Trash2 className="h-5 w-5 text-red-500" />
                </motion.button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-card/50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground/60">Trades</span>
                      <TrendingUp className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-2xl font-semibold mt-1">
                      {result.total_trades}
                    </p>
                  </div>

                  <div className="bg-card/50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground/60">Win Rate</span>
                      <div className="flex items-center">
                        {result.win_rate >= 0.5 ? (
                          <ArrowUpRight className="h-4 w-4 text-green-500" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </div>
                    <p className="text-2xl font-semibold mt-1">
                      {(result.win_rate * 100).toFixed(1)}%
                    </p>
                  </div>

                  <div className="bg-card/50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground/60">P&L</span>
                      <div className="flex items-center">
                        {result.profit_loss >= 0 ? (
                          <ArrowUpRight className="h-4 w-4 text-green-500" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </div>
                    <p className={`text-2xl font-semibold mt-1 ${
                      result.profit_loss >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {result.profit_loss >= 0 ? '+' : ''}{result.profit_loss.toFixed(2)}%
                    </p>
                  </div>

                  <div className="bg-card/50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground/60">Drawdown</span>
                      <ArrowDownRight className="h-4 w-4 text-red-500" />
                    </div>
                    <p className="text-2xl font-semibold mt-1 text-red-500">
                      {result.max_drawdown.toFixed(2)}%
                    </p>
                  </div>
                </div>

                <div className="bg-card/50 rounded-lg p-4">
                  <h4 className="text-sm font-medium mb-2">Paramètres</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-foreground/60">Lookback:</span>
                      <span className="ml-2">{result.detailed_results.parameters.lookback}</span>
                    </div>
                    <div>
                      <span className="text-foreground/60">Threshold:</span>
                      <span className="ml-2">{result.detailed_results.parameters.threshold}</span>
                    </div>
                    <div>
                      <span className="text-foreground/60">Stop Loss:</span>
                      <span className="ml-2">{result.detailed_results.parameters.stopLoss}</span>
                    </div>
                    <div>
                      <span className="text-foreground/60">Take Profit:</span>
                      <span className="ml-2">{result.detailed_results.parameters.takeProfit}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={result.detailed_results.performance_data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      stroke="hsl(var(--foreground))"
                      tick={{ fill: 'hsl(var(--foreground))' }}
                    />
                    <YAxis
                      stroke="hsl(var(--foreground))"
                      tick={{ fill: 'hsl(var(--foreground))' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.5rem'
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        ))}

        {results.length === 0 && !loading && (
          <div className="text-center py-12 text-foreground/60">
            Aucun entraînement effectué
          </div>
        )}
      </div>
      <HomeButton />
    </div>
  );
}
