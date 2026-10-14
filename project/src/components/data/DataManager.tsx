import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Trash2, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { DataUploader } from '../ui/DataUploader';
import { PageProgress } from '../layout/PageProgress';
import toast from 'react-hot-toast';
import * as Dialog from '@radix-ui/react-dialog';

interface DataSet {
  id: string;
  instrument: string;
  timestamp: string;
  created_at: string;
}

interface DataRow {
  id: string;
  timestamp: string;
  open_price: number;
  high_price: number;
  low_price: number;
  close_price: number;
  volume: number;
}

export function DataManager() {
  const { session } = useAuth();
  const [datasets, setDatasets] = useState<DataSet[]>([]);
  const [selectedData, setSelectedData] = useState<DataRow[] | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) {
      fetchDatasets(session.user.id);
    }
  }, [session]);

  const fetchDatasets = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('historical_data')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const uniqueDatasets = (data || []).reduce((acc, curr) => {
        const key = `${curr.instrument}_${curr.created_at}`;
        if (!acc[key]) {
          acc[key] = curr;
        }
        return acc;
      }, {} as Record<string, DataSet>);

      setDatasets(Object.values(uniqueDatasets));
    } catch {
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('historical_data')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setDatasets(datasets.filter(dataset => dataset.id !== id));
      toast.success('Données supprimées avec succès');
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handlePreview = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('historical_data')
        .select('*')
        .eq('id', id)
        .limit(5);

      if (error) throw error;

      setSelectedData(data as unknown as DataRow[]);
      setPreviewOpen(true);
    } catch {
      toast.error('Erreur lors du chargement de l\'aperçu');
    }
  };

  return (
    <div className="space-y-8">
      <PageProgress
        steps={['Import', 'Validation', 'Configuration', 'Entraînement']}
        currentStep={0}
      />

      <div className="grid gap-6">
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-xl font-semibold mb-4">Importer des données</h2>
          <DataUploader onSuccess={() => session && fetchDatasets(session.user.id)} />
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-xl font-semibold mb-4">Données importées</h2>
          <div className="grid gap-4">
            {datasets.map((dataset) => (
              <motion.div
                key={dataset.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-4 bg-card/50 rounded-lg border border-border"
              >
                <div className="flex items-center space-x-4">
                  <FileText className="h-6 w-6 text-primary" />
                  <div>
                    <h3 className="font-medium">{dataset.instrument}</h3>
                    <p className="text-sm text-foreground/60">
                      Importé le {new Date(dataset.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handlePreview(dataset.id)}
                    className="p-2 rounded-lg hover:bg-primary/10"
                    aria-label="Aperçu"
                  >
                    <Eye className="h-5 w-5 text-foreground/60" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleDelete(dataset.id)}
                    className="p-2 rounded-lg hover:bg-red-500/10"
                    aria-label="Supprimer"
                  >
                    <Trash2 className="h-5 w-5 text-red-500" />
                  </motion.button>
                </div>
              </motion.div>
            ))}

            {datasets.length === 0 && !loading && (
              <div className="text-center py-8 text-foreground/60">
                Aucune donnée importée
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog.Root open={previewOpen} onOpenChange={setPreviewOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-card rounded-lg shadow-lg p-6 w-full max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-xl font-semibold">
                Aperçu des données
              </Dialog.Title>
              <Dialog.Close className="p-2 hover:bg-primary/10 rounded-lg">
                <Eye className="h-5 w-5" />
              </Dialog.Close>
            </div>

            <div className="overflow-x-auto">
              {selectedData && (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-4 py-2 text-left">Date</th>
                      <th className="px-4 py-2 text-left">Open</th>
                      <th className="px-4 py-2 text-left">High</th>
                      <th className="px-4 py-2 text-left">Low</th>
                      <th className="px-4 py-2 text-left">Close</th>
                      <th className="px-4 py-2 text-left">Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedData.map((row) => (
                      <tr key={row.id} className="border-b border-border/50">
                        <td className="px-4 py-2">{new Date(row.timestamp).toLocaleString()}</td>
                        <td className="px-4 py-2">{row.open_price}</td>
                        <td className="px-4 py-2">{row.high_price}</td>
                        <td className="px-4 py-2">{row.low_price}</td>
                        <td className="px-4 py-2">{row.close_price}</td>
                        <td className="px-4 py-2">{row.volume}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
