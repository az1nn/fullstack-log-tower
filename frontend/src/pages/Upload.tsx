import { useState, ChangeEvent, FormEvent } from 'react';
import { Upload as UploadIcon, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../lib/axios';

export function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus('idle');
    }
  };

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file); // O nome 'file' deve coincidir com o que o Fastify espera

    try {
      await api.post('/logs/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setStatus('success');
      setFile(null);
    } catch (error) {
      setStatus('error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-zinc-200">
      <h2 className="text-2xl font-bold text-zinc-800 mb-6">Importar Arquivo de Logs</h2>

      <form onSubmit={handleUpload} className="flex flex-col gap-6">
        <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-zinc-300 border-dashed rounded-lg cursor-pointer bg-zinc-50 hover:bg-zinc-100 transition">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <UploadIcon className="w-10 h-10 text-zinc-400 mb-3" />
            <p className="mb-2 text-sm text-zinc-500">
              <span className="font-semibold">Clique para fazer upload</span> ou arraste e solte
            </p>
            <p className="text-xs text-zinc-500">{file ? file.name : 'Arquivos .txt ou .log (Máx. 100MB)'}</p>
          </div>
          <input type="file" className="hidden" accept=".txt,.log" onChange={handleFileChange} />
        </label>

        <button
          type="submit"
          disabled={!file || isUploading}
          className="bg-zinc-900 text-white py-3 rounded-lg font-medium hover:bg-zinc-800 disabled:opacity-50 transition"
        >
          {isUploading ? 'Processando...' : 'Iniciar Importação'}
        </button>
      </form>

      {status === 'success' && (
        <div className="mt-4 p-4 bg-emerald-50 text-emerald-700 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          <span>Upload concluído e logs processados com sucesso!</span>
        </div>
      )}

      {status === 'error' && (
        <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>Erro ao processar o arquivo. Verifique o formato e tente novamente.</span>
        </div>
      )}
    </div>
  );
}
