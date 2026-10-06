import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import RequestFormPage from '../pages/RequestFormPage';
import { api } from '../api/client';

vi.mock('../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('RequestFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays a server error when create fails', async () => {
    vi.mocked(api.post).mockRejectedValueOnce(
      Object.assign(new Error('Request failed'), { body: { error: 'Validation failed' } })
    );
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <RequestFormPage />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/Customer Name/), 'Alice Johnson');
    await user.type(screen.getByLabelText(/Service/), 'Lawn Mowing');
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Create Request' }));
    });

    expect(await screen.findByText('Validation failed')).toBeInTheDocument();
  });

  it('disables submission and shows loading while saving', async () => {
    vi.mocked(api.post).mockReturnValueOnce(new Promise(() => undefined));
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <RequestFormPage />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/Customer Name/), 'Alice Johnson');
    await user.type(screen.getByLabelText(/Service/), 'Lawn Mowing');
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Create Request' }));
    });

    expect(await screen.findByRole('button', { name: 'Saving…' })).toBeDisabled();
  });
});