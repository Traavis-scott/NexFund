import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { MainNav } from './components/layout/MainNav';
import { DataUploader } from './components/ui/DataUploader';
import { DashboardCard } from './components/ui/DashboardCard';
import { TradingHistory } from './components/ui/TradingHistory';
import { AuthForm } from './components/auth/AuthForm';
import { LandingPage } from './components/LandingPage';
import { TrialBanner } from './components/subscription/TrialBanner';
import { PricingPage } from './components/subscription/PricingPage';
import { DataPage } from './pages/DataPage';
import { StrategiesPage } from './pages/StrategiesPage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { BacktestPage } from './pages/BacktestPage';
import { AIConfigurator } from './components/training/AIConfigurator';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { Toaster } from 'react-hot-toast';

function Dashboard() {
  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" />
      <TrialBanner />
      <MainNav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DashboardCard title="Importer des Données" className="md:col-span-2">
            <DataUploader />
          </DashboardCard>

          <DashboardCard title="Performance de la Stratégie">
            <TradingHistory />
          </DashboardCard>

          <DashboardCard title="Intelligence Artificielle">
            <AIConfigurator />
          </DashboardCard>
        </div>
      </main>
    </div>
  );
}

function AppRoutes() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-foreground/60">Chargement...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={!session ? <LandingPage /> : <Navigate to="/dashboard" />} />
      <Route path="/auth" element={!session ? <AuthForm /> : <Navigate to="/dashboard" />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/dashboard" element={session ? <Dashboard /> : <Navigate to="/auth" />} />
      <Route path="/strategies" element={session ? <StrategiesPage /> : <Navigate to="/auth" />} />
      <Route path="/backtest" element={session ? <BacktestPage /> : <Navigate to="/auth" />} />
      <Route path="/data" element={session ? <DataPage /> : <Navigate to="/auth" />} />
      <Route path="/history" element={session ? <HistoryPage /> : <Navigate to="/auth" />} />
      <Route path="/settings" element={session ? <SettingsPage /> : <Navigate to="/auth" />} />
      <Route path="/help" element={session ? <div className="min-h-screen bg-background"><MainNav /><div className="max-w-7xl mx-auto px-4 py-8 text-foreground/60">Centre d'aide - Documentation à venir</div></div> : <Navigate to="/auth" />} />
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
