import { describe, it, expect } from 'vitest';
import type {
  SubscriptionStatus,
  UserProfile,
} from './types';

describe('types', () => {
  it('SubscriptionStatus accepts all required fields', () => {
    const status: SubscriptionStatus = {
      isActive: true,
      trialEnd: '2026-12-01T00:00:00Z',
      currentPeriodEnd: '2026-12-29T00:00:00Z',
      cancelAtPeriodEnd: false,
    };
    expect(status.isActive).toBe(true);
    expect(status.trialEnd).toBe('2026-12-01T00:00:00Z');
    expect(status.currentPeriodEnd).toBe('2026-12-29T00:00:00Z');
    expect(status.cancelAtPeriodEnd).toBe(false);
  });

  it('SubscriptionStatus accepts null for date fields', () => {
    const status: SubscriptionStatus = {
      isActive: false,
      trialEnd: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    };
    expect(status.trialEnd).toBeNull();
    expect(status.currentPeriodEnd).toBeNull();
  });

  it('UserProfile contains an id and a subscription', () => {
    const profile: UserProfile = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      subscription: {
        isActive: true,
        trialEnd: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      },
    };
    expect(profile.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(profile.subscription.isActive).toBe(true);
  });
});
