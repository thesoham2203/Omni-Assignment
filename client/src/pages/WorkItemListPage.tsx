import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { WorkItem } from '../types/index';
import StatusBadge from '../components/StatusBadge';
import { Link } from 'react-router-dom';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function WorkItemListPage() {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const data = await api.get<WorkItem[]>('/work-items');
        setItems(data);
      } catch (err: unknown) {
        setError((err as { message?: string }).message ?? 'Failed to load work items');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Work Items</h1>
        <p className="text-gray-500 text-sm mt-0.5">Qualified requests converted to actionable work items</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      ) : error ? (
        <div className="text-center py-16 text-red-600">
          <p className="font-medium">⚠️ Error loading work items</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-24">
          <p className="text-4xl mb-4">🗂️</p>
          <p className="text-lg font-medium text-gray-700">No work items yet</p>
          <p className="text-sm text-gray-500 mt-1">
            Convert a QUALIFIED request to create a work item.
          </p>
          <Link
            to="/requests"
            className="inline-block mt-4 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            View Requests
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900">{item.customer_name}</p>
                  <p className="text-sm text-gray-500">{item.service}</p>
                </div>
                <StatusBadge status={item.request_status} />
              </div>

              {item.scheduled_date && (
                <div className="text-xs text-gray-500">
                  📅 {formatDate(item.scheduled_date)}
                </div>
              )}

              {item.description && (
                <p className="text-xs text-gray-600 line-clamp-2">{item.description}</p>
              )}

              <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  Created {formatDate(item.created_at)}
                </span>
                <Link
                  to={`/requests/${item.request_id}`}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  View Request →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
