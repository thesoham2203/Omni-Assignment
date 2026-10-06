import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { Request } from '../types/index';

interface FormData {
  customer_name: string;
  service: string;
  description: string;
  scheduled_date: string;
}

export default function RequestFormPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<FormData>({
    customer_name: '',
    service: '',
    description: '',
    scheduled_date: '',
  });
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEdit);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEdit || !id) return;
    void (async () => {
      try {
        const data = await api.get<Request>(`/requests/${id}`);
        setForm({
          customer_name: data.customer_name,
          service: data.service,
          description: data.description ?? '',
          scheduled_date: data.scheduled_date ?? '',
        });
      } catch (err: unknown) {
        setError((err as { message?: string }).message ?? 'Failed to load request');
      } finally {
        setFetchLoading(false);
      }
    })();
  }, [id, isEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      customer_name: form.customer_name,
      service: form.service,
      description: form.description || null,
      scheduled_date: form.scheduled_date || null,
    };

    try {
      if (isEdit && id) {
        await api.patch(`/requests/${id}`, payload);
        navigate(`/requests/${id}`);
      } else {
        const created = await api.post<Request>('/requests', payload);
        navigate(`/requests/${created.id}`);
      }
    } catch (err: unknown) {
      const e = err as { message?: string; body?: { error?: string; details?: unknown } };
      setError(e.body?.error ?? e.message ?? 'Failed to save request');
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <div className="flex justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          to={isEdit && id ? `/requests/${id}` : '/requests'}
          className="text-sm text-blue-600 hover:underline mb-2 inline-block"
        >
          ← {isEdit ? 'Back to request' : 'Back to requests'}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'Edit Request' : 'New Request'}
        </h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="customer_name">
              Customer Name <span className="text-red-500">*</span>
            </label>
            <input
              id="customer_name"
              name="customer_name"
              type="text"
              value={form.customer_name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="service">
              Service <span className="text-red-500">*</span>
            </label>
            <input
              id="service"
              name="service"
              type="text"
              value={form.service}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Lawn Mowing, Web Design"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="scheduled_date">
              Scheduled Date
              <span className="text-gray-400 text-xs ml-1">(required to convert to work item)</span>
            </label>
            <input
              id="scheduled_date"
              name="scheduled_date"
              type="date"
              value={form.scheduled_date}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Any additional details about this request…"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Link
              to={isEdit && id ? `/requests/${id}` : '/requests'}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
