import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Dashboard } from './Dashboard';
import { api } from '../lib/axios';

vi.mock('../lib/axios', () => ({
  api: {
    get: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
    data: {
      summary: { total: 10 },
      distribution: [
        { level: 'INFO', count: 6 },
        { level: 'ERROR', count: 4 },
      ],
      trends: [{ date: '2024-01-01', count: 3 }],
      trendsByLevel: [
        { date: '2024-01-01', INFO: 6, ERROR: 4, WARN: 0, DEBUG: 0, FATAL: 0 },
      ],
    },
  });
});

describe('Dashboard page', () => {
  it('renders the total card from /metrics', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(await screen.findByText('Total de Logs Registrados')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('calls api.get with /metrics', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/metrics', expect.any(Object));
    });
  });
});
