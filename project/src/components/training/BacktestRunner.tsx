import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Brain, Play, TrendingUp, TrendingDown, Percent, BarChart2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  createAndTrainModel,
  predictNextMove,
  calculateReturns,
  generateSampleData,
  type CandleData,
  type BacktestResult,
} from '@/utils/aiBacktest';

export function BacktestRunner() {
  const [results, setResults] = useState<BacktestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [windowSize, setWindowSize] = useState(10);
  const [threshold, setThreshold] = useState(0.05);

  const runBacktest = async () => {
    setIsLoading(true);
    setResults(null);
    try {
      const sampleData: CandleData[] = generateSampleData(100);
      const priceData = sampleData.map((d) => [d.open, d.high, d.low, d.close, d.volume]);

      const model = await createAndTrainModel(priceData, windowSize);

      const predictions: number[] = [];
      for (let i = windowSize; i < priceData.length; i++) {
        const sequence = priceData.slice(i - windowSize, i);
        const pred = await predictNextMove(model, sequence, windowSize);
        predictions.push(pred);
      }

      const closePrices = sampleData.slice(windowSize).map((d) => d.close);
      const rawResults = calculateReturns(predictions, closePrices, threshold);

      setResults({
        trades: rawResults.trades.map((t) => ({
          date: t.date,
          type: t.type,
          price: t.price,
          quantity: 1,
        })),
        totalProfit: rawResults.totalProfit,
        winRate: rawResults.winRate,
        maxDrawdown: rawResults.maxDrawdown,
        performanceData: rawResults.performanceData,
      });

      model.dispose();
      toast.success('Backtest IA terminé avec succès');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Erreur lors du backtest IA',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const metrics = results
    ? [
        {
          label: 'Profit Total',
          value: `$${results.totalProfit.toFixed(2)}`,
          icon: results.totalProfit >= 0 ? TrendingUp : TrendingDown,
          color: results.totalProfit >= 0 ? 'text-green-500' : 'text-red-500',
        },
        {
          label: 'Taux de Réussite',
          value: `${(results.winRate * 100).toFixed(1)}%`,
          icon: Percent,
          color: 'text-primary',
        },
        {
          label: 'Drawdown Max',
          value: `${results.maxDrawdown.toFixed(1)}%`,
          icon: BarChart2,
          color: 'text-orange-500',
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-6">
          <Brain className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Paramètres du Backtest IA</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-2">
              Fenêtre d'analyse (jours)
            </label>
            <input
              type="number"
              value={windowSize}
              min={5}
              max={30}
              onChange={(e) => setWindowSize(Math.max(5, Math.min(30, +e.target.value)))}
              className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground"
            />
            <p className="mt-1 text-sm text-foreground/60">
              Nombre de jours analysés pour détecter les patterns
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Seuil de confiance
            </label>
            <input
              type="number"
              value={threshold}
              step={0.01}
              min={0.01}
              max={0.5}
              onChange={(e) => setThreshold(Math.max(0.01, Math.min(0.5, +e.target.value)))}
              className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground"
            />
            <p className="mt-1 text-sm text-foreground/60">
              Niveau minimum de confiance pour les signaux de trading
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={runBacktest}
            disabled={isLoading}
            className={`
              px-6 py-2 rounded-lg flex items-center gap-2
              ${
                isLoading
                  ? 'bg-primary/50 cursor-not-allowed text-primary-foreground'
                  : 'bg-primary hover:bg-primary/90 text-primary-foreground'
              }
            `}
          >
            {isLoading ? (
              <>
                <Brain className="animate-spin h-5 w-5" />
                <span>Entraînement du modèle IA...</span>
              </>
            ) : (
              <>
                <Play className="h-5 w-5" />
                <span>Lancer le Backtest IA</span>
              </>
            )}
          </motion.button>
        </div>
      </div>

      {results && (
        <>
          <div className="bg-card rounded-lg border border-border p-6">
            <h3 className="text-lg font-semibold mb-4">Résultats du Backtest</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {metrics.map((metric) => (
                <div key={metric.label} className="bg-card/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <metric.icon className={`h-5 w-5 ${metric.color}`} />
                    <span className="text-sm text-foreground/60">{metric.label}</span>
                  </div>
                  <span className={`text-xl font-semibold ${metric.color}`}>
                    {metric.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border p-6">
            <h3 className="text-lg font-semibold mb-4">Courbe de Performance</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={results.performanceData}>
                  <defs>
                    <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem',
                      padding: '0.5rem',
                    }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <ReferenceLine y={1000} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: 'hsl(var(--primary))' }}
                    fillOpacity={1}
                    fill="url(#colorEquity)"
                    name="Capital"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {results.trades.length > 0 && (
            <div className="bg-card rounded-lg border border-border p-6">
              <h3 className="text-lg font-semibold mb-4">Historique des Trades</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-foreground/60 font-medium">Date</th>
                      <th className="text-left py-3 px-4 text-foreground/60 font-medium">Type</th>
                      <th className="text-right py-3 px-4 text-foreground/60 font-medium">Prix</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.trades.map((trade, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-3 px-4 text-foreground">{trade.date}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm ${
                              trade.type === 'buy'
                                ? 'bg-green-500/10 text-green-500'
                                : 'bg-red-500/10 text-red-500'
                            }`}
                          >
                            {trade.type === 'buy' ? 'Achat' : 'Vente'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-foreground">
                          ${trade.price.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
