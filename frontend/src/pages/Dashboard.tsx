import { useEffect, useState, useCallback, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Activity, RefreshCw } from 'lucide-react';
import { api } from '../lib/axios';

const LEVELS = ['INFO', 'WARN', 'ERROR', 'DEBUG', 'FATAL'] as const;
type Level = typeof LEVELS[number];

type TrendsByLevel = {
  date: string;
  INFO: number;
  WARN: number;
  ERROR: number;
  DEBUG: number;
  FATAL: number;
};

type MetricsData = {
  summary: { total: number };
  distribution: { level: string; count: number }[];
  trends: { date: string; count: number }[];
  trendsByLevel: TrendsByLevel[];
};

const COLORS: Record<Level, string> = {
  INFO: '#3b82f6',  // blue
  WARN: '#eab308',  // yellow
  ERROR: '#ef4444', // red
  DEBUG: '#71717a', // zinc
  FATAL: '#a855f7', // purple
};

type Preset = '24h' | '7d' | '30d' | 'custom';

function presetRange(preset: Preset): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  if (preset === '24h') start.setHours(start.getHours() - 24);
  if (preset === '7d') start.setDate(start.getDate() - 7);
  if (preset === '30d') start.setDate(start.getDate() - 30);
  if (preset === 'custom') return { startDate: '', endDate: '' };
  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
}

export function Dashboard() {
  const [data, setData] = useState<MetricsData | null>(null);
  const [preset, setPreset] = useState<Preset>('30d');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [loading, setLoading] = useState(false);

  function toISO(v: string, end = false) {
    if (!v) return undefined
    return new Date(v + (end ? 'T23:59:59.999Z' : 'T00:00:00.000Z')).toISOString()
  }

  const buildParams = useCallback(() => {
    if (preset === 'custom') {
      const params: Record<string, string> = {};
      const s = toISO(startDate);
      const e = toISO(endDate, true);
      if (s) params.startDate = s;
      if (e) params.endDate = e;
      return params;
    }
    return presetRange(preset);
  }, [preset, startDate, endDate]);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/metrics', { params: buildParams() });
      setData(response.data);
    } catch (error) {
      console.error('Erro ao buscar métricas', error);
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const intervalRef = useRef<number | null>(null);
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = window.setInterval(() => {
        fetchMetrics();
      }, 30000);
    }
    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoRefresh, fetchMetrics]);

  if (!data) return <div className="text-zinc-500">Carregando dashboard...</div>;

  return (
    <div className="flex flex-col gap-6">
      {/* Controles de data e refresh */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-zinc-200 flex flex-wrap items-center gap-4">
        <div className="flex gap-2">
          {(['24h', '7d', '30d', 'custom'] as Preset[]).map((p) => (
            <button
              key={p}
              onClick={() => setPreset(p)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                preset === p
                  ? 'bg-zinc-800 text-white border-zinc-800'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
              }`}
            >
              {p === 'custom' ? 'Personalizado' : p}
            </button>
          ))}
        </div>

        {preset === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 text-sm rounded-lg border border-zinc-200 text-zinc-700"
            />
            <span className="text-zinc-400">até</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 text-sm rounded-lg border border-zinc-200 text-zinc-700"
            />
          </div>
        )}

        <div className="flex items-center gap-4 ml-auto">
          <label className="flex items-center gap-2 text-sm text-zinc-600 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 accent-zinc-800"
            />
            Auto-refresh (30s)
          </label>
          <button
            onClick={fetchMetrics}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Card Totalizador */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-zinc-200 flex items-center justify-between w-64">
        <div>
          <p className="text-sm text-zinc-500 font-medium">Total de Logs Registrados</p>
          <p className="text-3xl font-bold text-zinc-800 mt-1">{data.summary.total.toLocaleString()}</p>
        </div>
        <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center">
          <Activity className="w-6 h-6 text-zinc-700" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Tendência (Linha) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-zinc-200 lg:col-span-2">
          <h3 className="text-lg font-bold text-zinc-800 mb-6">Volume Diário de Logs</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.trendsByLevel}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} tickLine={false} />
                <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                {LEVELS.map((level) => (
                  <Line
                    key={level}
                    type="monotone"
                    dataKey={level}
                    name={level}
                    stroke={COLORS[level]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Distribuição (Pizza) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-zinc-200">
          <h3 className="text-lg font-bold text-zinc-800 mb-6">Distribuição por Severidade</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.distribution}
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="level"
                >
                  {data.distribution.map((entry) => (
                    <Cell key={entry.level} fill={COLORS[entry.level as Level] || COLORS.INFO} />
                  ))}
                </Pie>
                <Tooltip
                  itemStyle={{ color: '#18181b' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
