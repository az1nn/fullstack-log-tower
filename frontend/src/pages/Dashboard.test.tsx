import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('custom range normalizes end-of-day and omits cleared dates', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    vi.mocked(api.get).mockClear();
    vi.mocked(api.get).mockResolvedValue({
      data: {
        summary: { total: 0 },
        distribution: [],
        trends: [],
        trendsByLevel: [],
      },
    });

    await user.click(await screen.findByText('Personalizado'));

    const dateInputs = screen.getAllByDisplayValue('') as HTMLInputElement[];
    fireEvent.change(dateInputs[0], { target: { value: '2026-07-15' } });
    fireEvent.change(dateInputs[1], { target: { value: '2026-07-16' } });

    await waitFor(() => {
      const calls = vi.mocked(api.get).mock.calls.filter((c) => c[0] === '/metrics');
      const last = calls[calls.length - 1] as unknown as [string, { params: Record<string, string> }];
      expect(last[1].params.startDate).toBe('2026-07-15T00:00:00.000Z');
      expect(last[1].params.endDate).toBe('2026-07-16T23:59:59.999Z');
    });

    fireEvent.change(dateInputs[1], { target: { value: '' } });

    await waitFor(() => {
      const calls = vi.mocked(api.get).mock.calls.filter((c) => c[0] === '/metrics');
      const last = calls[calls.length - 1] as unknown as [string, { params: Record<string, string> }];
      expect(last[1].params.startDate).toBe('2026-07-15T00:00:00.000Z');
      expect(last[1].params.endDate).toBeUndefined();
    });
  });
});
