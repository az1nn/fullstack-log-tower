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
