import * as tf from '@tensorflow/tfjs';

export interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface BacktestResult {
  trades: { date: string; type: 'buy' | 'sell'; price: number; quantity: number }[];
  totalProfit: number;
  winRate: number;
  maxDrawdown: number;
  performanceData: { date: string; value: number }[];
}

export async function createAndTrainModel(data: number[][], windowSize: number) {
  const sequences: number[][][] = [];
  const labels: number[] = [];

  for (let i = 0; i < data.length - windowSize; i++) {
    sequences.push(data.slice(i, i + windowSize));
    labels.push(data[i + windowSize][3] > data[i + windowSize - 1][3] ? 1 : 0);
  }

  const xs = tf.tensor3d(sequences);
  const ys = tf.tensor1d(labels);

  const model = tf.sequential();
  model.add(
    tf.layers.lstm({
      units: 50,
      inputShape: [windowSize, data[0].length],
      returnSequences: false,
    }),
  );
  model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));

  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'binaryCrossentropy',
    metrics: ['accuracy'],
  });

  await model.fit(xs, ys, {
    epochs: 50,
    batchSize: 32,
    shuffle: true,
    validationSplit: 0.1,
  });

  xs.dispose();
  ys.dispose();

  return model;
}

export async function predictNextMove(
  model: tf.LayersModel,
  data: number[][],
  windowSize: number,
): Promise<number> {
  const sequence = data.slice(-windowSize);
  const prediction = (await model.predict(tf.tensor3d([sequence]))) as tf.Tensor;
  const probabilityUp = await prediction.data();
  const result = probabilityUp[0];
  prediction.dispose();
  return result;
}

export function calculateReturns(
  predictions: number[],
  actualPrices: number[],
  threshold: number,
): {
  trades: { type: 'buy' | 'sell'; price: number; date: string }[];
  totalProfit: number;
  winRate: number;
  maxDrawdown: number;
  performanceData: { date: string; value: number }[];
} {
  let position: 'none' | 'long' = 'none';
  const trades: { type: 'buy' | 'sell'; price: number; date: string }[] = [];
  let equity = 1000;
  let maxEquity = equity;
  let maxDrawdown = 0;
  let wins = 0;
  let totalTrades = 0;
  const performanceData: { date: string; value: number }[] = [];

  for (let i = 0; i < predictions.length; i++) {
    const prediction = predictions[i];
    const price = actualPrices[i];
    const dateStr = new Date(Date.now() - (predictions.length - i) * 86400000)
      .toISOString()
      .split('T')[0];

    if (prediction > 0.5 + threshold && position === 'none') {
      position = 'long';
      trades.push({ type: 'buy', price, date: dateStr });
    } else if (prediction < 0.5 - threshold && position === 'long') {
      position = 'none';
      trades.push({ type: 'sell', price, date: dateStr });

      const lastBuy = trades[trades.length - 2].price;
      const profit = (price - lastBuy) / lastBuy;
      equity *= 1 + profit;
      maxEquity = Math.max(maxEquity, equity);
      maxDrawdown = Math.max(maxDrawdown, (maxEquity - equity) / maxEquity);

      if (profit > 0) wins++;
      totalTrades++;
    }

    performanceData.push({ date: dateStr, value: equity });
  }

  return {
    trades,
    totalProfit: equity - 1000,
    winRate: totalTrades > 0 ? wins / totalTrades : 0,
    maxDrawdown: maxDrawdown * 100,
    performanceData,
  };
}

export function generateSampleData(count = 100): CandleData[] {
  return Array.from({ length: count }, (_, i) => {
    const basePrice = 100;
    const trend = Math.sin(i / 10) * 10;
    const noise = Math.random() * 5 - 2.5;
    const price = basePrice + trend + noise;

    return {
      time: new Date(Date.now() - (count - i) * 86400000)
        .toISOString()
        .split('T')[0],
      open: price,
      high: price + Math.random() * 2,
      low: price - Math.random() * 2,
      close: price + Math.random() * 4 - 2,
      volume: 1000 + Math.random() * 1000,
    };
  });
}
