import { useState, ChangeEvent, FormEvent, DragEvent } from 'react';
import { Upload as UploadIcon, CheckCircle, AlertCircle, AlertTriangle, FilePlus, X } from 'lucide-react';
import { api } from '../lib/axios';
import { generateMockLogs } from '../lib/mockLogs';

const MAX_SIZE = 100 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['.txt', '.log'];

export function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'success' | 'error' | 'duplicate'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [validationError, setValidationError] = useState('');

  const [showGenerator, setShowGenerator] = useState(false);
  const [genCount, setGenCount] = useState(10);
  const [genDays, setGenDays] = useState(1);
  const [genService, setGenService] = useState('');
  const [genMessage, setGenMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleGenerate = (importLogs: boolean) => {
    const text = generateMockLogs({ count: genCount, days: genDays, service: genService || undefined });
    const file = new File([text], 'mock-logs.log', { type: 'text/plain' });

    if (!importLogs) {
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mock-logs.log';
      a.click();
      URL.revokeObjectURL(url);
      setShowGenerator(false);
      setGenMessage('Downloaded mock-logs.log — import it above');
      return;
    }

    void uploadFile(file);
    setShowGenerator(false);
    setGenMessage('');
  };

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
    await uploadFile(file);
  };

  const uploadFile = async (selected: File) => {
    setIsUploading(true);
    setProgress(0);
    setStatus('idle');
    const formData = new FormData();
    formData.append('file', selected);

    try {
      const response = await api.post('/logs/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (event) => {
          if (event.total) {
            setProgress(Math.round((event.loaded * 100) / event.total));
          }
        },
      });
      const imported = response.data.imported ?? 0;
      const duplicates = response.data.duplicates ?? 0;
      if (duplicates > 0 && imported === 0) {
        setStatus('duplicate');
        setSuccessMessage('Este arquivo já foi importado anteriormente.');
      } else {
        setStatus('success');
        setSuccessMessage(`${imported} log(s) importado(s) com sucesso!`);
      }
      setGenMessage('');
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

        <button
          type="button"
          onClick={() => { setGenMessage(''); setShowGenerator(true); }}
          className="flex items-center justify-center gap-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 py-3 rounded-lg font-medium transition"
        >
          <FilePlus className="w-5 h-5" />
          Generate mock logs
        </button>
      </form>

      {status === 'error' ? (
        <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{errorMessage || 'Erro ao processar o arquivo. Verifique o formato e tente novamente.'}</span>
        </div>
      ) : status === 'duplicate' ? (
        <div className="mt-4 p-4 bg-amber-50 text-amber-700 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          <span>{successMessage}</span>
        </div>
      ) : status === 'success' ? (
        <div className="mt-4 p-4 bg-emerald-50 text-emerald-700 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          <span>{successMessage}</span>
        </div>
      ) : genMessage ? (
        <div className="mt-4 p-4 bg-emerald-50 text-emerald-700 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          <span>{genMessage}</span>
        </div>
      ) : null}

      {showGenerator && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setShowGenerator(false)}
        >
          <div
            className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-zinc-800">Generate mock logs</h3>
              <button
                type="button"
                onClick={() => setShowGenerator(false)}
                className="text-zinc-400 hover:text-zinc-600"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Count: {genCount}
                </label>
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={genCount}
                  onChange={(e) => setGenCount(Number(e.target.value))}
                  className="w-full"
                />
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={genCount}
                  onChange={(e) => setGenCount(Number(e.target.value))}
                  className="mt-1 w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Days back
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={genDays}
                  onChange={(e) => setGenDays(Number(e.target.value))}
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Service (optional)
                </label>
                <input
                  type="text"
                  value={genService}
                  onChange={(e) => setGenService(e.target.value)}
                  placeholder="optional, e.g. web"
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <button
                type="button"
                onClick={() => handleGenerate(true)}
                className="bg-zinc-900 text-white py-2.5 rounded-lg font-medium hover:bg-zinc-800 transition"
              >
                Generate &amp; import
              </button>

              <button
                type="button"
                onClick={() => handleGenerate(false)}
                className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 py-2.5 rounded-lg font-medium transition"
              >
                Download only
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
