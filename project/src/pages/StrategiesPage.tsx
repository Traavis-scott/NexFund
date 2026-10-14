import { AIConfigurator } from '../components/training/AIConfigurator';
import { HomeButton } from '../components/ui/HomeButton';

export function StrategiesPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold mb-8">Stratégies d'IA</h1>
      <AIConfigurator />
      <HomeButton />
    </div>
  );
}