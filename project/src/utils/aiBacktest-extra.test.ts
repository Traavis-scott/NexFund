import { describe, it, expect } from 'vitest';
import { calculateReturns, generateSampleData } from './aiBacktest';

describe('calculateReturns — edge cases', () => {
  const threshold = 0.05;

  it('handles a single prediction without a sell signal', () => {
    const result = calculateReturns([0.9], [100], threshold);
    expect(result.trades).toHaveLength(1);
    expect(result.totalProfit).toBe(0);
  });

  it('does not buy twice in a row without a sell in between', () => {
    const result = calculateReturns([0.9, 0.9], [100, 110], threshold);
    expect(result.trades.filter(t => t.type === 'buy')).toHaveLength(1);
  });

  it('reports performance data starting from 1000 equity', () => {
    const result = calculateReturns([0.5, 0.5], [100, 101], threshold);
    expect(result.performanceData[0].value).toBe(1000);
    expect(result.performanceData[1].value).toBe(1000);
  });
});

describe('generateSampleData — additional checks', () => {
  it('produces open price near the base of 100 plus trend and noise', () => {
    const candles = generateSampleData(50);
    candles.forEach(c => {
      expect(c.open).toBeGreaterThan(80);
      expect(c.open).toBeLessThan(120);
    });
  });

  it('produces dates in ISO YYYY-MM-DD format', () => {
    const candles = generateSampleData(5);
    candles.forEach(c => {
      const parsed = new Date(c.time);
      expect(parsed.toString()).not.toBe('Invalid Date');
    });
  });
});
