import { describe, it, expect } from 'vitest';
import { checkExpiredSubscriptions } from './subscriptionCheck';

describe('subscriptionCheck', () => {
  it('checkExpiredSubscriptions resolves without error', async () => {
    await expect(checkExpiredSubscriptions()).resolves.toBeUndefined();
  });

  it('checkExpiredSubscriptions returns void (no-op)', async () => {
    const result = await checkExpiredSubscriptions();
    expect(result).toBeUndefined();
  });
});
