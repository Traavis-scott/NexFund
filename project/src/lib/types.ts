export interface SubscriptionStatus {
  isActive: boolean;
  trialEnd: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface UserProfile {
  id: string;
  subscription: SubscriptionStatus;
}