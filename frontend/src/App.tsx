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
