import { DataManager } from '../components/data/DataManager';
import { HomeButton } from '../components/ui/HomeButton';

export function DataPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold mb-8">Gestion des données</h1>
      <DataManager />
      <HomeButton />
    </div>
  );
}