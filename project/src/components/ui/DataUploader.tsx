import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import toast from 'react-hot-toast';

interface DataUploaderProps {
  onSuccess?: () => void;
}

export function DataUploader({ onSuccess }: DataUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const { session } = useAuth();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!session) {
      toast.error('Vous devez etre connecte');
      return;
    }

    setUploading(true);
    try {
      const file = acceptedFiles[0];
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-data`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'X-User-Id': session.user.id,
        },
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Erreur lors de l\'import');

      toast.success(`${result.count} enregistrements importes avec succes`);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'import');
    } finally {
      setUploading(false);
    }
  }, [session, onSuccess]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/json': ['.json']
    },
    disabled: uploading,
    maxFiles: 1
  });

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
        ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
        ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input {...getInputProps()} />
      {uploading ? (
        <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin mb-4" />
      ) : (
        <Upload className="w-12 h-12 mx-auto text-foreground/40 mb-4" />
      )}
      {uploading ? (
        <p className="text-lg text-primary">Importation en cours...</p>
      ) : isDragActive ? (
        <p className="text-lg text-primary">Deposez les fichiers ici...</p>
      ) : (
        <div>
          <p className="text-lg text-foreground/60">
            Glissez-deposez vos fichiers de donnees ici, ou cliquez pour selectionner
          </p>
          <p className="text-sm text-foreground/40 mt-2">
            Formats supportes: CSV, JSON
          </p>
        </div>
      )}
    </div>
  );
}
