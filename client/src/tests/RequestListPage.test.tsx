import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import RequestListPage from '../pages/RequestListPage';
import { api } from '../api/client';

vi.mock('../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('RequestListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('recovers from a list error when Retry succeeds', async () => {
    vi.mocked(api.get)
      .mockRejectedValueOnce(new Error('Temporary failure'))
      .mockResolvedValueOnce([
        {
          id: 'req-1',
          customer_name: 'Alice Johnson',
          service: 'Lawn Mowing',
          scheduled_date: null,
          status: 'NEW',
          created_at: '2024-05-01T00:00:00Z',
        },
      ]);

    render(
      <MemoryRouter>
        <RequestListPage />
      </MemoryRouter>
    );

    expect(await screen.findByText(/Error loading requests/)).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('Alice Johnson')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledTimes(2);
  });
});