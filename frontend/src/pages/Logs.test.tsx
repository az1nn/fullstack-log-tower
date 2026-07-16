import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Logs } from './Logs';
import { api } from '../lib/axios';

vi.mock('../lib/axios', () => ({
  api: {
    get: vi.fn(),
  },
}));

const mockLogs = [
  { id: '1', timestamp: '2024-01-01T10:00:00Z', level: 'INFO', message: 'request ok', service: 'auth' },
  { id: '2', timestamp: '2024-01-01T11:00:00Z', level: 'ERROR', message: 'db error', service: 'db' },
];

function mockGet(overrides: Partial<{ data: unknown }> = {}) {
  (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
    data: {
      data: mockLogs,
      meta: { total: 2, totalPages: 1, page: 1, perPage: 10 },
    },
    ...overrides,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGet();
});

describe('Logs page', () => {
  it('renders logs fetched from the API with default page param', async () => {
    render(
      <MemoryRouter>
        <Logs />
      </MemoryRouter>
    );

    expect(await screen.findByText('db error')).toBeInTheDocument();
    expect(screen.getByText('request ok')).toBeInTheDocument();

    expect(api.get).toHaveBeenCalledWith('/logs', expect.objectContaining({ params: expect.objectContaining({ page: 1 }) }));
  });

  it('refetches with search param and resets page when searching', async () => {
    render(
      <MemoryRouter>
        <Logs />
      </MemoryRouter>
    );

    await screen.findByText('db error');

    const searchInput = screen.getByPlaceholderText('Buscar na mensagem...');
    await userEvent.type(searchInput, 'db');

    await waitFor(() => {
      const calls = (api.get as ReturnType<typeof vi.fn>).mock.calls;
      const last = calls[calls.length - 1];
      expect(last[0]).toBe('/logs');
      expect(last[1]).toMatchObject({ params: expect.objectContaining({ search: 'db', page: 1 }) });
    });
  });

  it('toggles a level filter and refetches with levels param', async () => {
    render(
      <MemoryRouter>
        <Logs />
      </MemoryRouter>
    );

    await screen.findByText('db error');

    const errorChip = screen.getByRole('button', { name: 'ERROR' });
    await userEvent.click(errorChip);

    await waitFor(() => {
      const calls = (api.get as ReturnType<typeof vi.fn>).mock.calls;
      const last = calls[calls.length - 1];
      expect(last[1]).toMatchObject({ params: expect.objectContaining({ levels: ['ERROR'], page: 1 }) });
    });

    await userEvent.click(within(errorChip).getByText('ERROR'));

    await waitFor(() => {
      const calls = (api.get as ReturnType<typeof vi.fn>).mock.calls;
      const last = calls[calls.length - 1];
      expect(last[1]).toMatchObject({ params: expect.not.objectContaining({ levels: ['ERROR'] }) });
    });
  });
});
