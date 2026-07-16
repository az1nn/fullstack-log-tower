import { Fragment, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Search, ChevronLeft, ChevronRight, Download, FileJson, X } from 'lucide-react';
import { api } from '../lib/axios';
import { downloadCsv, downloadJson, type Log } from '../lib/export';

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'FATAL';

const LOG_LEVELS: LogLevel[] = ['INFO', 'WARN', 'ERROR', 'DEBUG', 'FATAL'];

const EXPORT_ALL_CAP = 10000;

function highlightMessage(message: string, term: string) {
  if (!term) return message;
  const parts = message.split(new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === term.toLowerCase() ? (
      <mark key={i} className="bg-yellow-200 text-zinc-900 rounded px-0.5">
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export function Logs() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedLevels, setSelectedLevels] = useState<LogLevel[]>([]);
  const [service, setService] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const buildFilterParams = () => ({
    search: search || undefined,
    levels: selectedLevels.length > 0 ? selectedLevels : undefined,
    service: service || undefined,
    startDate: startDate ? new Date(startDate).toISOString() : undefined,
    endDate: endDate ? new Date(endDate).toISOString() : undefined,
  });

  const fetchLogs = async () => {
    try {
      const response = await api.get('/logs', {
        params: { page, ...buildFilterParams() }
      });
      setLogs(response.data.data);
      setTotalPages(response.data.meta.totalPages);
    } catch (error) {
      console.error('Erro ao buscar logs', error);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, search, selectedLevels, service, startDate, endDate]); // Refaz a busca quando qualquer filtro muda

  const toggleLevel = (level: LogLevel) => {
    setSelectedLevels((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
    );
    setPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedLevels([]);
    setService('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const activeFilterCount =
    (search ? 1 : 0) +
    selectedLevels.length +
    (service ? 1 : 0) +
    (startDate ? 1 : 0) +
    (endDate ? 1 : 0);

  const fetchAllFiltered = async (): Promise<{ rows: Log[]; truncated: boolean }> => {
    const perPage = 1000;
    const rows: Log[] = [];
    let currentPage = 1;
    let pages = 1;
    let truncated = false;

    do {
      const response = await api.get('/logs', {
        params: { page: currentPage, perPage, ...buildFilterParams() },
      });
      rows.push(...(response.data.data as Log[]));
      pages = response.data.meta.totalPages;

      if (rows.length >= EXPORT_ALL_CAP) {
        truncated = rows.length > EXPORT_ALL_CAP || currentPage < pages;
        break;
      }
      currentPage += 1;
    } while (currentPage <= pages);

    return { rows: rows.slice(0, EXPORT_ALL_CAP), truncated };
  };

  const exportCurrent = (kind: 'csv' | 'json') => {
    if (kind === 'csv') downloadCsv(logs, 'logs-page.csv');
    else downloadJson(logs, 'logs-page.json');
  };

  const exportAll = async (kind: 'csv' | 'json') => {
    setExporting(true);
    try {
      const { rows, truncated } = await fetchAllFiltered();
      const suffix = truncated ? '-truncated-10k' : '-filtered';
      if (kind === 'csv') downloadCsv(rows, `logs${suffix}.csv`);
      else downloadJson(rows, `logs${suffix}.json`);
    } catch (error) {
      console.error('Erro ao exportar logs', error);
    } finally {
      setExporting(false);
    }
  };

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

      {/* Barra de ferramentas de exportação */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          onClick={() => exportCurrent('csv')}
          className="flex items-center gap-2 px-3 py-2 text-sm border border-zinc-300 rounded-lg hover:bg-zinc-50 disabled:opacity-50"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
        <button
          onClick={() => exportCurrent('json')}
          className="flex items-center gap-2 px-3 py-2 text-sm border border-zinc-300 rounded-lg hover:bg-zinc-50 disabled:opacity-50"
        >
          <FileJson className="w-4 h-4" /> Export JSON
        </button>
        <button
          onClick={() => exportAll('csv')}
          disabled={exporting}
          className="flex items-center gap-2 px-3 py-2 text-sm border border-zinc-300 rounded-lg hover:bg-zinc-50 disabled:opacity-50"
        >
          <Download className="w-4 h-4" /> {exporting ? 'Exportando...' : 'Export all (filtered)'}
        </button>
      </div>

      {/* Barra de Filtros */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {LOG_LEVELS.map((level) => {
            const active = selectedLevels.includes(level);
            return (
              <button
                key={level}
                onClick={() => toggleLevel(level)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${
                  active
                    ? `${levelColors[level]} border-transparent`
                    : 'bg-white text-zinc-500 border-zinc-300 hover:bg-zinc-50'
                }`}
              >
                {level}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Filtrar por serviço..."
            value={service}
            onChange={(e) => { setService(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
          <input
            type="datetime-local"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
          <input
            type="datetime-local"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />

          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-600 hover:bg-zinc-50"
            >
              <X className="w-4 h-4" />
              Limpar filtros ({activeFilterCount})
            </button>
          )}
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
              <Fragment key={log.id}>
                <tr
                  onClick={() => setExpandedId((id) => (id === log.id ? null : log.id))}
                  className="border-b border-zinc-100 hover:bg-zinc-50 transition cursor-pointer"
                >
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
                {expandedId === log.id && (
                  <tr className="border-b border-zinc-100 bg-zinc-50">
                    <td colSpan={3} className="py-4 px-4">
                      <div className="space-y-2 text-sm">
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-zinc-600">
                          <span>
                            <span className="font-medium text-zinc-500">Timestamp:</span>{' '}
                            {format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss')}
                          </span>
                          <span>
                            <span className="font-medium text-zinc-500">Nível:</span> {log.level}
                          </span>
                          {log.service && (
                            <span>
                              <span className="font-medium text-zinc-500">Serviço:</span> {log.service}
                            </span>
                          )}
                        </div>
                        <div className="text-zinc-800 whitespace-pre-wrap break-words">
                          <span className="font-medium text-zinc-500">Mensagem: </span>
                          {highlightMessage(log.message, search)}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
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
