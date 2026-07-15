import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../lib/axios';

type Log = {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'FATAL';
  message: string;
};

export function Logs() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    try {
      const response = await api.get('/logs', {
        params: { page, search: search || undefined }
      });
      setLogs(response.data.data);
      setTotalPages(response.data.meta.totalPages);
    } catch (error) {
      console.error('Erro ao buscar logs', error);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, search]); // Refaz a busca se a página ou a pesquisa mudar

  const levelColors = {
    INFO: 'bg-blue-100 text-blue-700',
    WARN: 'bg-yellow-100 text-yellow-700',
    ERROR: 'bg-red-100 text-red-700',
    DEBUG: 'bg-zinc-100 text-zinc-700',
    FATAL: 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-zinc-200">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-zinc-800">Explorar Logs</h2>

        {/* Campo de Busca */}
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-2.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar na mensagem..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-10 pr-4 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500 text-sm">
              <th className="py-3 px-4 font-medium">Data/Hora</th>
              <th className="py-3 px-4 font-medium">Nível</th>
              <th className="py-3 px-4 font-medium">Mensagem</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-zinc-100 hover:bg-zinc-50 transition">
                <td className="py-3 px-4 text-sm text-zinc-600 whitespace-nowrap">
                  {format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss')}
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${levelColors[log.level]}`}>
                    {log.level}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-zinc-700 truncate max-w-xl">
                  {log.message}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      <div className="flex items-center justify-between mt-6">
        <span className="text-sm text-zinc-500">Página {page} de {totalPages}</span>
        <div className="flex gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="p-2 border border-zinc-300 rounded-md disabled:opacity-50 hover:bg-zinc-50"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            className="p-2 border border-zinc-300 rounded-md disabled:opacity-50 hover:bg-zinc-50"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
