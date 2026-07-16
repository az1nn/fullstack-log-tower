import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Upload } from './Upload';
import { api } from '../lib/axios';

vi.mock('../lib/axios', () => ({
  api: {
    post: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Upload page', () => {
  it('disables the submit button when no file is selected', () => {
    render(
      <MemoryRouter>
        <Upload />
      </MemoryRouter>
    );

    const button = screen.getByRole('button', { name: /Iniciar Importação/i });
    expect(button).toBeDisabled();
  });

  it('shows an inline error for too large a file', async () => {
    render(
      <MemoryRouter>
        <Upload />
      </MemoryRouter>
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    const bigFile = new File(['x'], 'huge.log', { type: 'text/plain' });
    Object.defineProperty(bigFile, 'size', { value: 200 * 1024 * 1024 });

    await userEvent.upload(input, bigFile);

    expect(await screen.findByText(/Arquivo muito grande/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Iniciar Importação/i })).toBeDisabled();
  });

  it('shows the success message after a successful upload', async () => {
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { message: 'ok', imported: 5 } });

    render(
      <MemoryRouter>
        <Upload />
      </MemoryRouter>
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    const file = new File(['line1\nline2'], 'app.log', { type: 'text/plain' });
    await userEvent.upload(input, file);

    const button = screen.getByRole('button', { name: /Iniciar Importação/i });
    expect(button).toBeEnabled();

    await userEvent.click(button);

    expect(await screen.findByText('5 logs importados com sucesso!')).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith('/logs/upload', expect.any(FormData), expect.any(Object));
  });

  it('shows an error message when the upload fails', async () => {
    (api.post as ReturnType<typeof vi.fn>).mockRejectedValue({ response: { data: { message: 'invalid format' } } });

    render(
      <MemoryRouter>
        <Upload />
      </MemoryRouter>
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    const file = new File(['line1'], 'app.log', { type: 'text/plain' });
    await userEvent.upload(input, file);

    const button = screen.getByRole('button', { name: /Iniciar Importação/i });
    await userEvent.click(button);

    expect(await screen.findByText('invalid format')).toBeInTheDocument();
  });
});
