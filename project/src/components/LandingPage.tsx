import { motion } from 'framer-motion';
import { Briefcase, CheckCircle2, LineChart, Lock, ArrowRight, Sparkles, BarChart3, Zap } from 'lucide-react';
import { TradingChart } from './ui/TradingChart';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function LandingPage() {
  const [activeFeature, setActiveFeature] = useState(0);
  const navigate = useNavigate();
  
  const features = [
    {
      title: "Backtesting avancé",
      description: "Testez vos stratégies sur des données historiques avec une précision milliseconde",
      icon: BarChart3
    },
    {
      title: "Intelligence Artificielle",
      description: "Optimisez vos stratégies grâce à nos modèles d'IA de pointe",
      icon: Sparkles
    },
    {
      title: "Exécution rapide",
      description: "Performance et fiabilité pour vos analyses en temps réel",
      icon: Zap
    }
  ];

  const handleGetStarted = () => {
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-2">
              <Briefcase className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold text-foreground">NexFund</span>
            </div>
            <div className="flex items-center space-x-6">
              <a href="#features" className="text-sm text-foreground/60 hover:text-foreground">
                Fonctionnalités
              </a>
              <a href="#demo" className="text-sm text-foreground/60 hover:text-foreground">
                Démo
              </a>
              <button 
                onClick={() => navigate('/pricing')}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
              >
                Try for free
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-32">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-full h-full bg-gradient-to-b from-primary/5 to-background" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center space-x-2 rounded-full bg-primary/10 px-4 py-1 text-primary mb-8"
            >
              <span className="font-medium">Get 6+ proven trading strategies—tested and ready to use</span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl"
            >
              Start your first Trades
              <br />
              <span className="text-primary">with confidence</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-6 text-lg text-foreground/60 max-w-3xl mx-auto"
            >
              NexFund is the most effective way to backtest your strategies.
              Execute more confidently and accomplish your trading goals.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-8 flex flex-wrap justify-center gap-4"
            >
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGetStarted}
                className="inline-flex items-center rounded-lg bg-primary px-6 py-3 text-base font-medium text-primary-foreground hover:bg-primary/90"
              >
                Get started
                <ArrowRight className="ml-2 h-5 w-5" />
              </motion.button>
              <p className="w-full text-sm text-foreground/60 mt-2">
                Start for free. No credit card required.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-3">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                onMouseEnter={() => setActiveFeature(index)}
                className={`relative rounded-2xl border border-border p-8 transition-colors ${
                  activeFeature === index ? 'bg-primary/5' : 'bg-card'
                }`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mt-4 text-xl font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-2 text-foreground/60">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section id="demo" className="py-20 sm:py-32 bg-card/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative rounded-2xl border border-border bg-card p-8 shadow-lg overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
            <div className="relative">
              <TradingChart className="w-full" />
              <div className="mt-8 text-center">
                <h2 className="text-2xl font-bold text-foreground">
                  Visualisez vos résultats en temps réel
                </h2>
                <p className="mt-2 text-foreground/60">
                  Interface professionnelle avec des graphiques avancés et des analyses détaillées
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative rounded-2xl bg-primary/10 p-8 sm:p-12"
          >
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Prêt à révolutionner votre trading ?
              </h2>
              <p className="mt-4 text-lg text-foreground/60">
                Rejoignez des milliers de traders qui ont déjà optimisé leurs stratégies avec NexFund.
              </p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGetStarted}
                className="mt-8 inline-flex items-center rounded-lg bg-primary px-6 py-3 text-base font-medium text-primary-foreground hover:bg-primary/90"
              >
                Commencer gratuitement
                <ArrowRight className="ml-2 h-5 w-5" />
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}