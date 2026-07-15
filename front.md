Bora dar vida a essa interface, Leleco! Como a fundação do nosso backend já está bem sólida, o frontend precisa ser organizado para escalar com facilidade, separando bem as responsabilidades de roteamento, consumo de API e componentes visuais.

Para essa estrutura base, vamos precisar de algumas bibliotecas essenciais para roteamento, chamadas HTTP, ícones e gráficos (já antecipando o dashboard).

### 1. Instalando Dependências Base

No terminal, dentro da pasta `frontend`, instale os seguintes pacotes:

```bash
npm install react-router-dom axios lucide-react date-fns recharts

```

* **react-router-dom:** Para a navegação entre as páginas.
* **axios:** Para configurar um cliente HTTP padronizado.
* **lucide-react:** A biblioteca de ícones recomendada pelo *shadcn/ui*.
* **date-fns:** Para formatar as datas dos logs facilmente.
* **recharts:** Para os gráficos do dashboard.

---

### 2. Organizando a Arquitetura de Pastas

Para manter o projeto organizado, crie a seguinte estrutura dentro da pasta `src/`:

```text
src/
├── assets/         # Imagens genéricas
├── components/     # Componentes reutilizáveis (o shadcn/ui salva aqui dentro de /ui)
├── layouts/        # Estruturas de página (ex: Sidebar + Header)
├── lib/            # Configurações de bibliotecas de terceiros
├── pages/          # As telas da aplicação
└── App.tsx         # Ponto de entrada do roteamento

```

---

### 3. Configurando o Cliente HTTP (Axios)

Ter um cliente configurado em um só lugar facilita a injeção de tokens no futuro e a padronização da URL base do nosso Fastify.

Crie o arquivo `src/lib/axios.ts`:

```typescript
import axios from 'axios';

export const api = axios.create({
  // URL base do nosso backend Fastify
  baseURL: 'http://localhost:3333/api',
});

```

---

### 4. Criando o Layout Principal

Geralmente, um dashboard tem um menu lateral ou superior que se repete em todas as telas. Vamos criar um *Layout* padrão para envelopar nossas rotas.

Crie o arquivo `src/layouts/AppLayout.tsx`:

```tsx
import { Outlet, Link } from 'react-router-dom';
import { Activity, LayoutDashboard, List, Upload } from 'lucide-react';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-zinc-50 flex">
      {/* Sidebar Básica */}
      <aside className="w-64 bg-zinc-900 text-zinc-100 flex flex-col">
        <div className="p-6 flex items-center gap-2 border-b border-zinc-800">
          <Activity className="w-6 h-6 text-emerald-400" />
          <span className="font-bold text-lg">LogAnalyzer</span>
        </div>

        <nav className="flex-1 p-4 flex flex-col gap-2">
          <Link to="/" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-zinc-800 transition-colors">
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </Link>
          <Link to="/logs" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-zinc-800 transition-colors">
            <List className="w-5 h-5" />
            Explorar Logs
          </Link>
          <Link to="/upload" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-zinc-800 transition-colors">
            <Upload className="w-5 h-5" />
            Importar
          </Link>
        </nav>
      </aside>

      {/* Área Principal de Conteúdo */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-zinc-200 flex items-center px-8">
          <h1 className="text-zinc-600 font-medium">Plataforma de Análise</h1>
        </header>
        
        {/* O Outlet é onde as páginas filhas serão renderizadas */}
        <div className="flex-1 overflow-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

```

---

### 5. Estruturando as Rotas e as Páginas Iniciais

Vamos criar arquivos vazios apenas para as nossas páginas principais não quebrarem o roteador.

1. Crie `src/pages/Dashboard.tsx`: `export function Dashboard() { return <div>Dashboard em construção</div> }`
2. Crie `src/pages/Logs.tsx`: `export function Logs() { return <div>Tabela de logs em construção</div> }`
3. Crie `src/pages/Upload.tsx`: `export function Upload() { return <div>Upload em construção</div> }`

Agora, integre tudo no seu `src/App.tsx`:

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { Logs } from './pages/Logs';
import { Upload } from './pages/Upload';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Todas as rotas dentro do AppLayout terão a sidebar e o header */}
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="logs" element={<Logs />} />
          <Route path="upload" element={<Upload />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

```

Limpe o conteúdo original do `src/main.tsx` caso tenha arquivos de estilo antigos, mas certifique-se de que o CSS do Tailwind está sendo importado lá (`import './index.css'`).

Temos a casca do frontend pronta, navegável e integrada com o cliente da API! Qual dessas três telas você quer desenvolver primeiro: o Upload (para testar a injeção de dados de ponta a ponta), a Tabela de Logs (com filtros) ou o Dashboard (com os gráficos do Recharts)?


Vamos montar as três telas para fechar o ciclo, Leleco! Vou estruturar cada uma delas consumindo a nossa API base e utilizando o Tailwind para garantir um visual limpo e profissional.

Para que os exemplos funcionem perfeitamente, certifique-se de que a biblioteca Recharts está instalada (`npm i recharts`).

---

### 1. Tela de Upload (`src/pages/Upload.tsx`)

Esta tela envia o arquivo via `multipart/form-data` e gerencia os estados de carregamento e erro.

```tsx
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

```

---

### 2. Tela de Listagem e Filtros (`src/pages/Logs.tsx`)

Aqui implementamos a listagem conectada à rota paginada do Fastify, com um filtro de busca textual.

```tsx
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

```

---

### 3. Dashboard Estatístico (`src/pages/Dashboard.tsx`)

Essa tela utiliza os dados otimizados que preparamos no PostgreSQL + Prisma para montar os gráficos usando o `recharts`.

```tsx
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

```