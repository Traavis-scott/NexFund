import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Bell, Shield, Download, Trash2 } from 'lucide-react';
import * as Switch from '@radix-ui/react-switch';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import toast from 'react-hot-toast';
import { HomeButton } from '../components/ui/HomeButton';

interface UserSettings {
  notifications_enabled: boolean;
  auto_save_enabled: boolean;
  dark_mode_enabled: boolean;
}

export function SettingsPage() {
  const { session } = useAuth();
  const [email, setEmail] = useState('');
  const [settings, setSettings] = useState<UserSettings>({
    notifications_enabled: true,
    auto_save_enabled: true,
    dark_mode_enabled: true
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session?.user) {
      setEmail(session.user.email || '');
    }
  }, [session]);

  const handlePasswordReset = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      toast.success('Email de réinitialisation envoyé');
    } catch {
      toast.error('Erreur lors de l\'envoi de l\'email');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (setting: keyof UserSettings) => {
    setSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
    toast.success('Paramètre mis à jour');
  };

  const handleExportData = async () => {
    if (!session) return;
    try {
      setLoading(true);

      const { data: historicalData, error: historicalError } = await supabase
        .from('historical_data')
        .select('*')
        .eq('user_id', session.user.id);

      const { data: backtestResults, error: backtestError } = await supabase
        .from('backtest_results')
        .select('*')
        .eq('user_id', session.user.id);

      if (historicalError || backtestError) throw new Error('Erreur lors de l\'export');

      const exportData = {
        historical_data: historicalData,
        backtest_results: backtestResults
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trading_data_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Données exportées avec succès');
    } catch {
      toast.error('Erreur lors de l\'export des données');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.')) {
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('Compte supprimé avec succès');
    } catch {
      toast.error('Erreur lors de la suppression du compte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold mb-8">Paramètres</h1>

      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-lg border border-border p-6"
        >
          <div className="flex items-center space-x-4 mb-6">
            <div className="p-2 rounded-lg bg-primary/10">
              <User className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">Profil</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <div className="flex items-center space-x-4">
                <div className="flex-1 px-4 py-2 bg-card/50 rounded-lg border border-border">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-5 w-5 text-foreground/60" />
                    <span>{email}</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Mot de passe</label>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handlePasswordReset}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
              >
                <Lock className="h-5 w-5" />
                <span>Réinitialiser le mot de passe</span>
              </motion.button>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-lg border border-border p-6"
        >
          <div className="flex items-center space-x-4 mb-6">
            <div className="p-2 rounded-lg bg-primary/10">
              <Bell className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">Notifications</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Notifications par email</p>
                <p className="text-sm text-foreground/60">Recevoir des alertes sur les entraînements</p>
              </div>
              <Switch.Root
                checked={settings.notifications_enabled}
                onCheckedChange={() => handleSettingChange('notifications_enabled')}
                className={`w-11 h-6 rounded-full transition-colors ${
                  settings.notifications_enabled ? 'bg-primary' : 'bg-foreground/20'
                }`}
              >
                <Switch.Thumb className={`block w-5 h-5 bg-white rounded-full transition-transform ${
                  settings.notifications_enabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </Switch.Root>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Sauvegarde automatique</p>
                <p className="text-sm text-foreground/60">Sauvegarder les paramètres automatiquement</p>
              </div>
              <Switch.Root
                checked={settings.auto_save_enabled}
                onCheckedChange={() => handleSettingChange('auto_save_enabled')}
                className={`w-11 h-6 rounded-full transition-colors ${
                  settings.auto_save_enabled ? 'bg-primary' : 'bg-foreground/20'
                }`}
              >
                <Switch.Thumb className={`block w-5 h-5 bg-white rounded-full transition-transform ${
                  settings.auto_save_enabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </Switch.Root>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-lg border border-border p-6"
        >
          <div className="flex items-center space-x-4 mb-6">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">Sécurité & Données</h2>
          </div>

          <div className="space-y-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleExportData}
              disabled={loading}
              className="flex items-center space-x-2 w-full px-4 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
            >
              <Download className="h-5 w-5" />
              <span>Exporter mes données</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleDeleteAccount}
              disabled={loading}
              className="flex items-center space-x-2 w-full px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors"
            >
              <Trash2 className="h-5 w-5" />
              <span>Supprimer mon compte</span>
            </motion.button>
          </div>
        </motion.div>
      </div>
      <HomeButton />
    </div>
  );
}
