import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUp, ArrowDown, Calendar, DollarSign, Clock } from 'lucide-react';

interface Trade {
  id: string;
  type: 'buy' | 'sell';
  instrument: string;
  amount: number;
  price: number;
  timestamp: string;
  profit?: number;
}

const demoTrades: Trade[] = [
  {
    id: '1',
    type: 'buy',
    instrument: 'EURUSD',
    amount: 1000,
    price: 1.0923,
    timestamp: '2024-03-15T10:30:00Z',
  },
  {
    id: '2',
    type: 'sell',
    instrument: 'EURUSD',
    amount: 1000,
    price: 1.0945,
    timestamp: '2024-03-15T14:45:00Z',
    profit: 22
  },
  {
    id: '3',
    type: 'buy',
    instrument: 'BTCUSD',
    amount: 0.5,
    price: 67250,
    timestamp: '2024-03-16T09:15:00Z',
  },
  {
    id: '4',
    type: 'sell',
    instrument: 'BTCUSD',
    amount: 0.5,
    price: 67890,
    timestamp: '2024-03-16T16:20:00Z',
    profit: 320
  }
];

export function TradingHistory() {
  const [filter, setFilter] = useState<'all' | 'buy' | 'sell'>('all');

  const filteredTrades = demoTrades.filter(trade => {
    if (filter === 'all') return true;
    return trade.type === filter;
  });

  return (
    <div className="bg-card rounded-xl shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-foreground">Historique des Trades</h2>
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card border border-border text-foreground/60 hover:text-foreground'
            }`}
          >
            Tous
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setFilter('buy')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === 'buy'
                ? 'bg-green-500 text-white'
                : 'bg-card border border-border text-foreground/60 hover:text-foreground'
            }`}
          >
            Achats
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setFilter('sell')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === 'sell'
                ? 'bg-red-500 text-white'
                : 'bg-card border border-border text-foreground/60 hover:text-foreground'
            }`}
          >
            Ventes
          </motion.button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-foreground/60 font-medium">Type</th>
              <th className="text-left py-3 px-4 text-foreground/60 font-medium">Instrument</th>
              <th className="text-left py-3 px-4 text-foreground/60 font-medium">Montant</th>
              <th className="text-left py-3 px-4 text-foreground/60 font-medium">Prix</th>
              <th className="text-left py-3 px-4 text-foreground/60 font-medium">Date</th>
              <th className="text-right py-3 px-4 text-foreground/60 font-medium">P/L</th>
            </tr>
          </thead>
          <tbody>
            {filteredTrades.map((trade) => (
              <motion.tr
                key={trade.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="border-b border-border/50 hover:bg-card/50 transition-colors"
              >
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm ${
                    trade.type === 'buy' 
                      ? 'bg-green-500/10 text-green-500' 
                      : 'bg-red-500/10 text-red-500'
                  }`}>
                    {trade.type === 'buy' ? (
                      <ArrowUp className="w-4 h-4" />
                    ) : (
                      <ArrowDown className="w-4 h-4" />
                    )}
                    {trade.type === 'buy' ? 'Achat' : 'Vente'}
                  </span>
                </td>
                <td className="py-3 px-4 text-foreground">{trade.instrument}</td>
                <td className="py-3 px-4 text-foreground">
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4 text-foreground/60" />
                    {trade.amount.toLocaleString()}
                  </span>
                </td>
                <td className="py-3 px-4 text-foreground">{trade.price.toLocaleString()}</td>
                <td className="py-3 px-4 text-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-foreground/60" />
                    {new Date(trade.timestamp).toLocaleDateString()}
                    <Clock className="w-4 h-4 text-foreground/60 ml-2" />
                    {new Date(trade.timestamp).toLocaleTimeString()}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  {trade.profit !== undefined && (
                    <span className={`font-medium ${
                      trade.profit >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {trade.profit >= 0 ? '+' : ''}{trade.profit.toLocaleString()}$
                    </span>
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}