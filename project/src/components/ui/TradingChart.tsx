import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { motion } from 'framer-motion';
import { useState } from 'react';

const demoData = [
  { date: 'Feb 21', value: 280 },
  { date: 'Apr 21', value: 320 },
  { date: 'May 21', value: 350 },
  { date: 'Aug 21', value: 380 },
  { date: 'Apr 22', value: 400 },
  { date: 'Oct 22', value: 405 },
];

interface TradingChartProps {
  className?: string;
}

export function TradingChart({ className }: TradingChartProps) {
  const [activeInstrument, setActiveInstrument] = useState('EURUSD');
  
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          {['EURUSD', 'BTCUSD', 'NASDAQ'].map((instrument) => (
            <motion.button
              key={instrument}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveInstrument(instrument)}
              className={`
                px-4 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${activeInstrument === instrument 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-card border border-border text-foreground/60 hover:text-foreground'
                }
              `}
            >
              {instrument}
            </motion.button>
          ))}
        </div>
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 bg-card/50 px-4 py-2 rounded-lg border border-border"
        >
          <span className="text-green-500 text-2xl font-semibold">$405</span>
          <div className="flex flex-col items-end">
            <span className="text-xs text-green-500">+2.5%</span>
            <span className="text-xs text-foreground/60">24h</span>
          </div>
        </motion.div>
      </div>
      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={demoData}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="hsl(var(--border))" 
              vertical={false} 
            />
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
              itemStyle={{
                color: 'hsl(var(--foreground))',
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: 'hsl(var(--primary))' }}
              fillOpacity={1}
              fill="url(#colorValue)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}