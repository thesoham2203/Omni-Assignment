import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { RequestDetail, RequestStatus } from '../types/index';
import StatusBadge from '../components/StatusBadge';
import ActivityTimeline from '../components/ActivityTimeline';
import ConvertModal from '../components/ConvertModal';

const VALID_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  NEW: ['QUALIFIED', 'CLOSED'],
  QUALIFIED: ['CLOSED'],
  CLOSED: [],
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConvert, setShowConvert] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<RequestDetail>(`/requests/${id}`);
      setDetail(data);
    } catch (err: unknown) {
      setError((err as { message?: string }).message ?? 'Failed to load request');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchDetail();
  }, [fetchDetail]);

  const handleStatusChange = async (newStatus: RequestStatus) => {
    if (!detail) return;
    setStatusLoading(true);
    try {
      await api.patch(`/requests/${id}`, { status: newStatus });
      await fetchDetail();
      showToast(`Status changed to ${newStatus}`, 'success');
    } catch (err: unknown) {
      showToast((err as { message?: string }).message ?? 'Failed to update status', 'error');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleConvert = async () => {
    await api.post(`/requests/${id}/convert`);
    await fetchDetail();
    showToast('Request converted to work item!', 'success');
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="text-center py-24 text-red-600">
        <p className="text-xl font-medium">⚠️ {error ?? 'Request not found'}</p>
        <Link to="/requests" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
          ← Back to requests
        </Link>
      </div>
    );
  }

  const allowedTransitions = VALID_TRANSITIONS[detail.status];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition-all ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Back & Header */}
      <div className="mb-6">
        <Link to="/requests" className="text-sm text-blue-600 hover:underline mb-2 inline-block">
          ← Back to requests
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{detail.customer_name}</h1>
            <p className="text-gray-500 mt-0.5">{detail.service}</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={detail.status} />
            <Link
              to={`/requests/${id}/edit`}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
            >
              Edit
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
              Details
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-gray-500">Customer</dt>
                <dd className="text-sm font-medium text-gray-900 mt-0.5">{detail.customer_name}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Service</dt>
                <dd className="text-sm font-medium text-gray-900 mt-0.5">{detail.service}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Scheduled Date</dt>
                <dd className="text-sm font-medium text-gray-900 mt-0.5">
                  {detail.scheduled_date ? formatDate(detail.scheduled_date) : (
                    <span className="text-gray-400 italic">Not scheduled</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Created by</dt>
                <dd className="text-sm font-medium text-gray-900 mt-0.5">{detail.created_by_name}</dd>
              </div>
              {detail.description && (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-gray-500">Description</dt>
                  <dd className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">{detail.description}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Activity Timeline */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
              Activity Timeline
            </h2>
            <ActivityTimeline activities={detail.activity} />
          </div>
        </div>

        {/* Sidebar actions */}
        <div className="space-y-4">
          {/* Status transitions */}
          {allowedTransitions.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
                Change Status
              </h3>
              <div className="space-y-2">
                {allowedTransitions.map((s) => (
                  <button
                    key={s}
                    onClick={() => void handleStatusChange(s)}
                    disabled={statusLoading}
                    className="w-full py-2 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Mark as {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Convert to work item */}
          {detail.status === 'QUALIFIED' && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
                Actions
              </h3>
              {detail.work_item ? (
                <div className="text-sm text-green-700 bg-green-50 rounded-lg p-3">
                  ✅ Already converted to work item
                </div>
              ) : (
                <button
                  onClick={() => setShowConvert(true)}
                  className="w-full py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  ⚡ Convert to Work Item
                </button>
              )}
            </div>
          )}

          {/* Meta info */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-xs text-gray-400 space-y-1">
            <p>Created: {new Date(detail.created_at).toLocaleString()}</p>
            <p>Updated: {new Date(detail.updated_at).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Convert Modal */}
      {showConvert && (
        <ConvertModal
          request={detail}
          onConfirm={handleConvert}
          onClose={() => setShowConvert(false)}
        />
      )}
    </div>
  );
}
