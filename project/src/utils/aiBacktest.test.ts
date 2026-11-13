import { describe, it, expect } from 'vitest';
import { calculateReturns, generateSampleData } from './aiBacktest';

describe('calculateReturns', () => {
  const threshold = 0.1;

  it('returns empty results when there are no predictions', () => {
    const result = calculateReturns([], [], threshold);
    expect(result.trades).toEqual([]);
    expect(result.totalProfit).toBe(0);
    expect(result.winRate).toBe(0);
    expect(result.maxDrawdown).toBe(0);
    expect(result.performanceData).toEqual([]);
  });

  it('opens a long position on a strong up signal', () => {
    const result = calculateReturns([0.9], [100], threshold);
    expect(result.trades).toHaveLength(1);
    expect(result.trades[0]).toMatchObject({ type: 'buy', price: 100 });
  });

  it('does not open a position when the signal is inside the threshold band', () => {
    const result = calculateReturns([0.55], [100], threshold);
    expect(result.trades).toEqual([]);
  });

  it('does not sell when no position is open', () => {
    const result = calculateReturns([0.1, 0.1], [100, 100], threshold);
    expect(result.trades).toEqual([]);
  });

  it('closes a winning round trip and reports profit', () => {
    const result = calculateReturns([0.9, 0.1], [100, 110], threshold);
    expect(result.trades.map((t) => t.type)).toEqual(['buy', 'sell']);
    expect(result.totalProfit).toBeCloseTo(100, 6);
    expect(result.winRate).toBe(1);
  });

  it('closes a losing round trip and reports a loss', () => {
    const result = calculateReturns([0.9, 0.1], [100, 90], threshold);
    expect(result.totalProfit).toBeCloseTo(-100, 6);
    expect(result.winRate).toBe(0);
  });

  it('measures the largest drawdown from the equity peak', () => {
    const result = calculateReturns(
      [0.9, 0.1, 0.9, 0.1],
      [100, 110, 110, 99],
      threshold,
    );
    expect(result.maxDrawdown).toBeCloseTo(10, 6);
  });

  it('keeps an open position at the end without recording a sell', () => {
    const result = calculateReturns([0.9, 0.9], [100, 120], threshold);
    expect(result.trades.map((t) => t.type)).toEqual(['buy']);
    expect(result.totalProfit).toBe(0);
    expect(result.winRate).toBe(0);
  });

  it('returns one performance point per prediction', () => {
    const predictions = [0.9, 0.5, 0.1, 0.5];
    const result = calculateReturns(predictions, [100, 101, 102, 103], threshold);
    expect(result.performanceData).toHaveLength(predictions.length);
  });

  it('starts from an equity of 1000 and tracks it in performance data', () => {
    const result = calculateReturns([0.5], [100], threshold);
    expect(result.performanceData[0].value).toBe(1000);
  });

  it('computes win rate across several round trips', () => {
    const result = calculateReturns(
      [0.9, 0.1, 0.9, 0.1, 0.9, 0.1],
      [100, 110, 110, 100, 100, 120],
      threshold,
    );
    expect(result.winRate).toBeCloseTo(2 / 3, 6);
  });
});

describe('generateSampleData', () => {
  it('generates 100 candles by default', () => {
    expect(generateSampleData()).toHaveLength(100);
  });

  it('generates the requested number of candles', () => {
    expect(generateSampleData(25)).toHaveLength(25);
  });

  it('uses YYYY-MM-DD dates in ascending order', () => {
    const candles = generateSampleData(10);
    const dates = candles.map((c) => c.time);
    dates.forEach((d) => expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/));
    expect([...dates].sort()).toEqual(dates);
  });

  it('keeps high at or above low for every candle', () => {
    generateSampleData(200).forEach((c) => {
      expect(c.high).toBeGreaterThanOrEqual(c.low);
    });
  });

  it('keeps volume within the generated range', () => {
    generateSampleData(200).forEach((c) => {
      expect(c.volume).toBeGreaterThanOrEqual(1000);
      expect(c.volume).toBeLessThanOrEqual(2000);
    });
  });

  it('returns no candles for a count of zero', () => {
    expect(generateSampleData(0)).toEqual([]);
  });
});
