import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Menu, X, Settings, History, Brain, HelpCircle, LogOut, 
  TrendingUp, Sun, Moon, BookOpen, Save, Database, BarChart2
} from 'lucide-react';
import { useTheme } from '@/lib/ThemeProvider';
import { supabase } from '@/lib/supabase';
import { Drawer } from 'vaul';
import toast from 'react-hot-toast';

export function MainNav() {
  const [isOpen, setIsOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Déconnexion réussie');
      navigate('/auth');
    } catch (error) {
      toast.error('Erreur lors de la déconnexion');
    }
  };

  const menuItems = [
    {
      title: 'Tableau de bord',
      icon: TrendingUp,
      path: '/dashboard',
      description: 'Vue d\'ensemble de vos activités'
    },
    {
      title: 'Stratégies IA',
      icon: Brain,
      path: '/strategies',
      description: 'Gérer vos modèles d\'IA'
    },
    {
      title: 'Backtest IA',
      icon: BarChart2,
      path: '/backtest',
      description: 'Backtest avec modèle TensorFlow'
    },
    {
      title: 'Historique',
      icon: History,
      path: '/history',
      description: 'Voir vos entraînements passés'
    },
    {
      title: 'Données',
      icon: Database,
      path: '/data',
      description: 'Gérer vos jeux de données'
    },
    {
      title: 'Paramètres',
      icon: Settings,
      path: '/settings',
      description: 'Configurer votre compte'
    },
    {
      title: 'Centre d\'aide',
      icon: HelpCircle,
      path: '/help',
      description: 'FAQ et documentation'
    }
  ];

  return (
    <nav className="bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <Drawer.Root>
              <Drawer.Trigger asChild>
                <button
                  className="p-2 rounded-lg hover:bg-primary/10"
                  aria-label="Menu principal"
                >
                  <Menu className="h-6 w-6 text-foreground" />
                </button>
              </Drawer.Trigger>
              <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-black/40" />
                <Drawer.Content className="bg-card fixed bottom-0 left-0 right-0 mt-24 rounded-t-[10px] flex flex-col h-[96%]">
                  <div className="p-4 bg-card rounded-t-[10px] flex-1 overflow-auto">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-foreground">Menu</h2>
                      <Drawer.Close className="p-2 hover:bg-primary/10 rounded-lg">
                        <X className="h-5 w-5 text-foreground" />
                      </Drawer.Close>
                    </div>
                    <div className="grid gap-4">
                      {menuItems.map((item) => (
                        <motion.button
                          key={item.path}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            navigate(item.path);
                            setIsOpen(false);
                          }}
                          className={`flex items-center space-x-4 p-4 rounded-lg transition-colors ${
                            location.pathname === item.path
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-primary/10'
                          }`}
                        >
                          <item.icon className="h-5 w-5" />
                          <div className="flex-1 text-left">
                            <p className="font-medium">{item.title}</p>
                            <p className="text-sm opacity-70">{item.description}</p>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </Drawer.Content>
              </Drawer.Portal>
            </Drawer.Root>

            <TrendingUp className="h-8 w-8 text-primary ml-3" />
            <span className="ml-2 text-xl font-semibold text-foreground">AI Trading Platform</span>
          </div>

          <div className="flex items-center space-x-4">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-primary/10"
            >
              {theme === 'dark' ? (
                <Sun className="h-6 w-6 text-foreground" />
              ) : (
                <Moon className="h-6 w-6 text-foreground" />
              )}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/help')}
              className="p-2 rounded-lg hover:bg-primary/10"
            >
              <HelpCircle className="h-6 w-6 text-foreground" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-red-500/10"
            >
              <LogOut className="h-6 w-6 text-red-500" />
            </motion.button>
          </div>
        </div>
      </div>
    </nav>
  );
}