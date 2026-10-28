import { useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, Play, AlertCircle } from 'lucide-react';
import * as Select from '@radix-ui/react-select';
import { useAuth } from '@/lib/AuthContext';
import toast from 'react-hot-toast';

interface Strategy {
  id: string;
  name: string;
  description: string;
  parameters: {
    lookback: number;
    threshold: number;
    stopLoss: number;
    takeProfit: number;
  };
}

const predefinedStrategies: Strategy[] = [
  {
    id: 'trend-following',
    name: 'Trend Following',
    description: 'Suit les tendances de marche avec des moyennes mobiles',
    parameters: {
      lookback: 20,
      threshold: 0.02,
      stopLoss: 0.02,
      takeProfit: 0.04
    }
  },
  {
    id: 'mean-reversion',
    name: 'Mean Reversion',
    description: 'Exploite les retours a la moyenne des prix',
    parameters: {
      lookback: 10,
      threshold: 0.015,
      stopLoss: 0.015,
      takeProfit: 0.03
    }
  },
  {
    id: 'breakout',
    name: 'Breakout Trading',
    description: 'Detecte et suit les cassures de niveaux importants',
    parameters: {
      lookback: 30,
      threshold: 0.025,
      stopLoss: 0.02,
      takeProfit: 0.05
    }
  }
];

export function AIConfigurator() {
  const { session } = useAuth();
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const [parameters, setParameters] = useState(predefinedStrategies[0].parameters);
  const [isTraining, setIsTraining] = useState(false);

  const handleStrategyChange = (strategyId: string) => {
    const strategy = predefinedStrategies.find(s => s.id === strategyId);
    if (strategy) {
      setSelectedStrategy(strategy);
      setParameters(strategy.parameters);
    }
  };

  const handleParameterChange = (param: string, value: number) => {
    setParameters(prev => ({
      ...prev,
      [param]: value
    }));
  };

  const handleStartTraining = async () => {
    if (!selectedStrategy) {
      toast.error('Veuillez selectionner une strategie');
      return;
    }
    if (!session) {
      toast.error('Non authentifie');
      return;
    }

    setIsTraining(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/train-model`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'X-User-Id': session.user.id,
        },
        body: JSON.stringify({
          strategyId: selectedStrategy.id,
          parameters
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Erreur');

      toast.success('Entrainement termine avec succes');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'entrainement');
    } finally {
      setIsTraining(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-xl font-semibold mb-4">Configuration de l'IA</h2>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Selectionner une strategie
            </label>
            <Select.Root
              value={selectedStrategy?.id}
              onValueChange={handleStrategyChange}
            >
              <Select.Trigger className="w-full flex items-center justify-between px-4 py-2 bg-card border border-border rounded-lg">
                <Select.Value placeholder="Choisir une strategie" />
              </Select.Trigger>

              <Select.Portal>
                <Select.Content className="bg-card border border-border rounded-lg shadow-lg">
                  <Select.Viewport>
                    {predefinedStrategies.map((strategy) => (
                      <Select.Item
                        key={strategy.id}
                        value={strategy.id}
                        className="flex items-center px-4 py-2 hover:bg-primary/10 cursor-pointer"
                      >
                        <Select.ItemText>
                          <div>
                            <div className="font-medium">{strategy.name}</div>
                            <div className="text-sm text-foreground/60">
                              {strategy.description}
                            </div>
                          </div>
                        </Select.ItemText>
                      </Select.Item>
                    ))}
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </div>

          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Periode d'observation
              </label>
              <input
                type="number"
                value={parameters.lookback}
                onChange={(e) => handleParameterChange('lookback', +e.target.value)}
                className="w-full px-4 py-2 bg-card border border-border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Seuil de declenchement
              </label>
              <input
                type="number"
                step="0.001"
                value={parameters.threshold}
                onChange={(e) => handleParameterChange('threshold', +e.target.value)}
                className="w-full px-4 py-2 bg-card border border-border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Stop Loss
              </label>
              <input
                type="number"
                step="0.001"
                value={parameters.stopLoss}
                onChange={(e) => handleParameterChange('stopLoss', +e.target.value)}
                className="w-full px-4 py-2 bg-card border border-border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Take Profit
              </label>
              <input
                type="number"
                step="0.001"
                value={parameters.takeProfit}
                onChange={(e) => handleParameterChange('takeProfit', +e.target.value)}
                className="w-full px-4 py-2 bg-card border border-border rounded-lg"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setParameters(selectedStrategy?.parameters || predefinedStrategies[0].parameters)}
              className="px-4 py-2 rounded-lg border border-border hover:bg-card/80"
            >
              Reinitialiser
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleStartTraining}
              disabled={isTraining || !selectedStrategy}
              className={`
                px-4 py-2 rounded-lg flex items-center space-x-2
                ${isTraining || !selectedStrategy
                  ? 'bg-primary/50 cursor-not-allowed'
                  : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                }
              `}
            >
              {isTraining ? (
                <>
                  <Brain className="animate-spin h-5 w-5" />
                  <span>Entrainement en cours...</span>
                </>
              ) : (
                <>
                  <Play className="h-5 w-5" />
                  <span>Demarrer l'entrainement</span>
                </>
              )}
            </motion.button>
          </div>
        </div>
      </div>

      {selectedStrategy && (
        <div className="bg-primary/10 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <h3 className="font-medium text-primary">A propos de cette strategie</h3>
            <p className="mt-1 text-sm text-foreground/80">
              {selectedStrategy.description}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
