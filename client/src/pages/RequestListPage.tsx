import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Request, RequestStatus } from '../types/index';
import StatusBadge from '../components/StatusBadge';

const STATUS_TABS: Array<{ label: string; value: RequestStatus | 'ALL' }> = [
  { label: 'All', value: 'ALL' },
  { label: 'New', value: 'NEW' },
  { label: 'Qualified', value: 'QUALIFIED' },
  { label: 'Closed', value: 'CLOSED' },
];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function RequestListPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [activeTab, setActiveTab] = useState<RequestStatus | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async (status: RequestStatus | 'ALL') => {
    setLoading(true);
    setError(null);
    try {
      const qs = status !== 'ALL' ? `?status=${status}` : '';
      const data = await api.get<Request[]>(`/requests${qs}`);
      setRequests(data);
    } catch (err: unknown) {
      setError((err as { message?: string }).message ?? 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRequests(activeTab);
  }, [activeTab, fetchRequests]);

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Client Requests</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage and review incoming client requests</p>
        </div>
        <Link
          to="/requests/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <span>+</span> New Request
        </Link>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-6">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.value
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      ) : error ? (
        <div className="text-center py-16 text-red-600">
          <p className="text-lg font-medium">⚠️ Error loading requests</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={() => void fetchRequests(activeTab)}
            className="mt-4 px-4 py-2 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-4">📭</p>
          <p className="text-lg font-medium text-gray-700">No requests found</p>
          <p className="text-sm text-gray-500 mt-1">
            {activeTab !== 'ALL' ? `No ${activeTab} requests at this time.` : 'Create your first request to get started.'}
          </p>
          <Link
            to="/requests/new"
            className="inline-block mt-4 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Request
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Service</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">
                  Scheduled
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">
                  Created
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {requests.map((req) => (
                <tr
                  key={req.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{req.customer_name}</td>
                  <td className="px-4 py-3 text-gray-600">{req.service}</td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                    {req.scheduled_date ? formatDate(req.scheduled_date) : <span className="italic text-gray-400">Not set</span>}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={req.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-400 hidden md:table-cell">
                    {formatDate(req.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/requests/${req.id}`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
