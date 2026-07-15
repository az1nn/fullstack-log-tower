import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Activity } from 'lucide-react';
import { api } from '../lib/axios';

type MetricsData = {
  summary: { total: number };
  distribution: { level: string; count: number }[];
  trends: { date: string; count: number }[];
};

const COLORS = {
  INFO: '#3b82f6',  // blue
  WARN: '#eab308',  // yellow
  ERROR: '#ef4444', // red
  DEBUG: '#71717a', // zinc
  FATAL: '#a855f7', // purple
};

export function Dashboard() {
  const [data, setData] = useState<MetricsData | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await api.get('/metrics');
        setData(response.data);
      } catch (error) {
        console.error('Erro ao buscar métricas', error);
      }
    };
    fetchMetrics();
  }, []);

  if (!data) return <div className="text-zinc-500">Carregando dashboard...</div>;

  return (
    <div className="flex flex-col gap-6">
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
              <LineChart data={data.trends}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} tickLine={false} />
                <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Line type="monotone" dataKey="count" stroke="#18181b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
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
                    <Cell key={entry.level} fill={COLORS[entry.level as keyof typeof COLORS] || COLORS.INFO} />
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
