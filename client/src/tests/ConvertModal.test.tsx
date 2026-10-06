import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConvertModal from '../components/ConvertModal';
import { RequestDetail } from '../types/index';

const mockRequest: RequestDetail = {
  id: 'req-test',
  workspace_id: 'ws-test',
  customer_name: 'Alice Johnson',
  service: 'Lawn Mowing',
  description: 'Weekly service',
  scheduled_date: '2024-05-15',
  status: 'QUALIFIED',
  created_by: 'user-1',
  created_by_name: 'Test User',
  created_at: '2024-04-01T10:00:00Z',
  updated_at: '2024-04-01T10:00:00Z',
  activity: [],
  work_item: null,
};

const mockRequestNoDate: RequestDetail = {
  ...mockRequest,
  id: 'req-nodate',
  scheduled_date: null,
};

describe('ConvertModal', () => {
  const onClose = vi.fn();
  const onConfirm = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders customer name, service, and scheduled date', () => {
    render(
      <ConvertModal
        request={mockRequest}
        onConfirm={onConfirm}
        onClose={onClose}
      />
    );

    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.getByText('Lawn Mowing')).toBeInTheDocument();
    expect(screen.getByText('2024-05-15')).toBeInTheDocument();
  });

  it('calls onConfirm when Confirm Convert is clicked', async () => {
    const user = userEvent.setup();
    onConfirm.mockResolvedValue(undefined);

    render(
      <ConvertModal
        request={mockRequest}
        onConfirm={onConfirm}
        onClose={onClose}
      />
    );

    await act(async () => {
      await user.click(screen.getByText('Confirm Convert'));
    });
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
  });

  it('calls onClose after successful confirm', async () => {
    const user = userEvent.setup();
    onConfirm.mockResolvedValue(undefined);

    render(
      <ConvertModal
        request={mockRequest}
        onConfirm={onConfirm}
        onClose={onClose}
      />
    );

    await act(async () => {
      await user.click(screen.getByText('Confirm Convert'));
    });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('calls onClose when Cancel is clicked', async () => {
    const user = userEvent.setup();

    render(
      <ConvertModal
        request={mockRequest}
        onConfirm={onConfirm}
        onClose={onClose}
      />
    );

    await user.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('disables Confirm button when scheduled_date is missing', () => {
    render(
      <ConvertModal
        request={mockRequestNoDate}
        onConfirm={onConfirm}
        onClose={onClose}
      />
    );

    const confirmBtn = screen.getByText('Confirm Convert');
    expect(confirmBtn).toBeDisabled();
  });

  it('shows "Not set" warning when scheduled_date is missing', () => {
    render(
      <ConvertModal
        request={mockRequestNoDate}
        onConfirm={onConfirm}
        onClose={onClose}
      />
    );

    expect(screen.getByText(/Not set — required for conversion/i)).toBeInTheDocument();
  });

  it('shows duplicate error feedback when confirmation is rejected', async () => {
    const user = userEvent.setup();
    const err = Object.assign(new Error('Already converted'), { status: 409 });
    onConfirm.mockRejectedValue(err);

    render(
      <ConvertModal
        request={mockRequest}
        onConfirm={onConfirm}
        onClose={onClose}
      />
    );

    await act(async () => {
      await user.click(screen.getByText('Confirm Convert'));
    });
    await waitFor(() => {
      expect(screen.getByText(/already been converted/i)).toBeInTheDocument();
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows generic error for non-409 failures', async () => {
    const user = userEvent.setup();
    const err = Object.assign(new Error('Network error'), { status: 500 });
    onConfirm.mockRejectedValue(err);

    render(
      <ConvertModal
        request={mockRequest}
        onConfirm={onConfirm}
        onClose={onClose}
      />
    );

    await act(async () => {
      await user.click(screen.getByText('Confirm Convert'));
    });
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('shows loading state while confirming', async () => {
    let resolve: () => void;
    const pending = new Promise<void>((res) => { resolve = res; });
    onConfirm.mockReturnValue(pending);

    render(
      <ConvertModal
        request={mockRequest}
        onConfirm={onConfirm}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByText('Confirm Convert'));
    expect(await screen.findByText('Converting…')).toBeInTheDocument();

    await act(async () => {
      resolve!();
      await pending;
    });
  });

  it('has correct aria attributes for accessibility', () => {
    render(
      <ConvertModal
        request={mockRequest}
        onConfirm={onConfirm}
        onClose={onClose}
      />
    );

    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', 'convert-modal-title');
  });
});
