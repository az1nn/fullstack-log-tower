import { useState, ChangeEvent, FormEvent, DragEvent } from 'react';
import { Upload as UploadIcon, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../lib/axios';

const MAX_SIZE = 100 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['.txt', '.log'];

export function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [validationError, setValidationError] = useState('');

  const validateFile = (selected: File): string => {
    const name = selected.name.toLowerCase();
    const isValidExtension = ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
    if (!isValidExtension) {
      return 'Formato inválido. Apenas arquivos .txt ou .log são aceitos.';
    }
    if (selected.size > MAX_SIZE) {
      return 'Arquivo muito grande. O tamanho máximo é 100MB.';
    }
    return '';
  };

  const handleFile = (selected: File | null) => {
    if (!selected) return;
    const error = validateFile(selected);
    if (error) {
      setValidationError(error);
      setFile(null);
      setStatus('idle');
      return;
    }
    setValidationError('');
    setFile(selected);
    setStatus('idle');
    setErrorMessage('');
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files && e.target.files[0] ? e.target.files[0] : null);
  };

  const handleDragOver = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files && e.dataTransfer.files[0] ? e.dataTransfer.files[0] : null);
  };

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      setValidationError(error);
      return;
    }

    setIsUploading(true);
    setProgress(0);
    setStatus('idle');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/logs/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (event) => {
          if (event.total) {
            setProgress(Math.round((event.loaded * 100) / event.total));
          }
        },
      });
      setStatus('success');
      setImportedCount(response.data.imported ?? 0);
      setFile(null);
    } catch (error: any) {
      setStatus('error');
      const data = error?.response?.data;
      if (data?.message) {
        setErrorMessage(data.message);
      } else if (data?.errors) {
        setErrorMessage(Array.isArray(data.errors) ? data.errors.join(', ') : String(data.errors));
      } else {
        setErrorMessage('Erro ao processar o arquivo. Verifique o formato e tente novamente.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const [importedCount, setImportedCount] = useState(0);

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-zinc-200">
      <h2 className="text-2xl font-bold text-zinc-800 mb-6">Importar Arquivo de Logs</h2>

      <form onSubmit={handleUpload} className="flex flex-col gap-6">
        <label
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="flex flex-col items-center justify-center w-full h-64 border-2 border-zinc-300 border-dashed rounded-lg cursor-pointer bg-zinc-50 hover:bg-zinc-100 transition"
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <UploadIcon className="w-10 h-10 text-zinc-400 mb-3" />
            <p className="mb-2 text-sm text-zinc-500">
              <span className="font-semibold">Clique para fazer upload</span> ou arraste e solte
            </p>
            <p className="text-xs text-zinc-500">{file ? file.name : 'Arquivos .txt ou .log (Máx. 100MB)'}</p>
          </div>
          <input type="file" className="hidden" accept=".txt,.log" onChange={handleFileChange} />
        </label>

        {validationError && (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span>{validationError}</span>
          </div>
        )}

        {isUploading && (
          <div className="w-full">
            <div className="w-full bg-zinc-200 rounded-full h-2.5">
              <div
                className="bg-zinc-900 h-2.5 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-xs text-zinc-500 mt-2 text-center">{progress}%</p>
          </div>
        )}

        <button
          type="submit"
          disabled={!file || isUploading}
          className="bg-zinc-900 text-white py-3 rounded-lg font-medium hover:bg-zinc-800 disabled:opacity-50 transition"
        >
          {isUploading ? 'Enviando...' : 'Iniciar Importação'}
        </button>
      </form>

      {status === 'success' && (
        <div className="mt-4 p-4 bg-emerald-50 text-emerald-700 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          <span>{importedCount} logs importados com sucesso!</span>
        </div>
      )}

      {status === 'error' && (
        <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{errorMessage || 'Erro ao processar o arquivo. Verifique o formato e tente novamente.'}</span>
        </div>
      )}
    </div>
  );
}
