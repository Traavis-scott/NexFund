import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';

interface PricingTier {
  name: string;
  tierValue: string;
  price: string;
  originalPrice?: string;
  description: string;
  features: string[];
  tag?: string;
}

export function PricingPage() {
  const [loading, setLoading] = useState(false);
  const [earlyBirdAvailable, setEarlyBirdAvailable] = useState(false);
  const navigate = useNavigate();
  const { session } = useAuth();

  useEffect(() => {
    checkEarlyBirdAvailability();
  }, []);

  const checkEarlyBirdAvailability = async () => {
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('id')
        .eq('tier', 'pro')
        .limit(20);

      if (error) {
        setEarlyBirdAvailable(true);
        return;
      }
      setEarlyBirdAvailable(data.length < 20);
    } catch {
      setEarlyBirdAvailable(true);
    }
  };

  const pricingTiers: PricingTier[] = [
    {
      name: 'Essai Gratuit',
      tierValue: 'essai gratuit',
      price: '0',
      description: 'Essayez notre plateforme pendant 1 mois',
      tag: '1 mois gratuit',
      features: [
        'Basic data analysis',
        '1 AI strategy',
        'Limited historical data',
        'Basic support',
        'Acces 1 mois'
      ]
    },
    {
      name: 'Pro',
      tierValue: 'pro',
      price: earlyBirdAvailable ? '24.99' : '49',
      originalPrice: earlyBirdAvailable ? '49' : undefined,
      description: 'Pour les traders et investisseurs serieux',
      tag: earlyBirdAvailable ? 'Offre limitee - 50% de reduction' : undefined,
      features: [
        'Advanced data analysis',
        'Unlimited AI strategies',
        'Full historical data access',
        'Priority support',
        'Real-time alerts',
        'Custom indicators'
      ]
    }
  ];

  const handleCheckout = async (tier: string) => {
    try {
      setLoading(true);

      if (!session) {
        navigate('/auth');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-lygos-session`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: session.user.email,
          tier: tier,
          earlyBird: earlyBirdAvailable && tier === 'pro'
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la redirection vers le paiement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Tarification simple et transparente
          </h1>
          <p className="mt-4 text-xl text-foreground/60">
            Commencez gratuitement et evoluez selon vos besoins
          </p>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-2 lg:gap-12">
          {pricingTiers.map((tier) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative rounded-2xl border border-border bg-card p-8 shadow-lg"
            >
              {tier.tag && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="inline-flex items-center px-4 py-1 rounded-full text-sm font-medium bg-primary text-primary-foreground">
                    {tier.tag}
                  </span>
                </div>
              )}

              <div className="flex flex-col">
                <h3 className="text-xl font-semibold text-foreground">{tier.name}</h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-5xl font-bold tracking-tight text-foreground">${tier.price}</span>
                  {tier.price !== '0' && <span className="ml-1 text-xl font-semibold text-foreground/60">/mois</span>}
                  {tier.originalPrice && (
                    <span className="ml-2 text-lg line-through text-foreground/40">
                      ${tier.originalPrice}/mois
                    </span>
                  )}
                </div>
                <p className="mt-6 text-foreground/60">{tier.description}</p>

                <ul className="mt-8 space-y-4">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-center">
                      <Check className="h-5 w-5 text-primary" />
                      <span className="ml-3 text-foreground/80">{feature}</span>
                    </li>
                  ))}
                </ul>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleCheckout(tier.tierValue)}
                  disabled={loading}
                  className={`
                    mt-8 flex items-center justify-center rounded-lg px-6 py-3
                    text-base font-medium transition-colors
                    ${tier.name === 'Pro'
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'bg-card border border-border hover:bg-card/80'
                    }
                    ${loading ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  {tier.price === '0' ? 'Commencer l\'essai gratuit' : 'S\'abonner maintenant'}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>

        {earlyBirdAvailable && (
          <div className="mt-8 text-center text-sm text-foreground/60">
            <p>L'offre a -50% est limitee aux 20 premiers clients. Ne tardez pas !</p>
          </div>
        )}
      </div>
    </div>
  );
}
