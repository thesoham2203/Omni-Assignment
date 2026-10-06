import { useState } from 'react';
import { RequestDetail } from '../types/index';

interface Props {
  request: RequestDetail;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export default function ConvertModal({ request, onConfirm, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      if (e.status === 409) {
        setError('This request has already been converted to a work item.');
      } else {
        setError(e.message ?? 'Failed to convert request. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="convert-modal-title"
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <h2 id="convert-modal-title" className="text-lg font-bold text-gray-900 mb-4">
          Convert to Work Item
        </h2>

        <div className="space-y-3 mb-6">
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wide">Customer</span>
            <p className="text-sm font-medium text-gray-900">{request.customer_name}</p>
          </div>
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wide">Service</span>
            <p className="text-sm font-medium text-gray-900">{request.service}</p>
          </div>
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wide">Scheduled Date</span>
            <p className="text-sm font-medium text-gray-900">
              {request.scheduled_date ?? (
                <span className="text-red-500 italic">Not set — required for conversion</span>
              )}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleConfirm()}
            disabled={loading || !request.scheduled_date}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Converting…' : 'Confirm Convert'}
          </button>
        </div>
      </div>
    </div>
  );
}
