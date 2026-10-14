// Subscription expiry checking is handled server-side by the
// check-subscriptions edge function. This file is kept for backwards
// compatibility but no longer performs client-side subscription mutations.
export async function checkExpiredSubscriptions(): Promise<void> {
  // No-op: the check-subscriptions edge function handles this server-side.
}
