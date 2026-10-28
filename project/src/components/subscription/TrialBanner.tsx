import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import type { SubscriptionStatus } from '@/lib/types';

export function TrialBanner() {
  const { session } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!session) return;

    const userId = session.user.id;

    async function getSubscriptionStatus() {
      try {
        const { data, error } = await supabase
          .from('user_subscriptions')
          .select('trial_end, current_period_end, cancel_at_period_end')
          .eq('user_id', userId)
          .maybeSingle();

        if (error) {
          console.error('Error fetching subscription:', error);
          return;
        }

        if (data) {
          const trialEnd = new Date(data.trial_end);
          const now = new Date();
          const remainingDays = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          setDaysRemaining(remainingDays);
          setSubscription({
            isActive: true,
            trialEnd: data.trial_end,
            currentPeriodEnd: data.current_period_end,
            cancelAtPeriodEnd: data.cancel_at_period_end
          });
        }
      } catch (error) {
        console.error('Error checking subscription status:', error);
      }
    }

    getSubscriptionStatus();
    const interval = setInterval(getSubscriptionStatus, 3600000);
    return () => clearInterval(interval);
  }, [session]);

  if (!subscription || !daysRemaining || daysRemaining <= 0 || dismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className="fixed top-16 inset-x-0 z-50"
      >
        <div className="bg-primary/10 border-b border-primary/20">
          <div className="max-w-7xl mx-auto py-3 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between flex-wrap">
              <div className="flex items-center">
                <span className="flex p-2 rounded-lg bg-primary/20">
                  <Clock className="h-5 w-5 text-primary" />
                </span>
                <p className="ml-3 font-medium text-foreground truncate">
                  <span>
                    {daysRemaining} jours restants dans votre periode d'essai.{' '}
                    <a href="/pricing" className="underline font-semibold">
                      Passer au plan premium
                    </a>
                  </span>
                </p>
              </div>
              <div className="shrink-0">
                <button
                  onClick={() => setDismissed(true)}
                  className="flex rounded-md p-2 hover:bg-primary/20 focus:outline-none"
                  aria-label="Fermer"
                >
                  <X className="h-5 w-5 text-foreground" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
