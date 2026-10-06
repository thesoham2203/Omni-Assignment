import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate('/requests', { replace: true });
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="text-4xl mb-3">📋</div>
            <h1 className="text-2xl font-bold text-gray-900">Client Request Desk</h1>
            <p className="text-gray-500 text-sm mt-1">Sign in to manage client requests</p>
          </div>

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Demo credentials hint */}
        <div className="mt-4 bg-white/70 backdrop-blur rounded-xl p-4 text-sm text-gray-600">
          <p className="font-semibold text-gray-700 mb-2">🔑 Demo Credentials</p>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">Acme Corp:</span>
              <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">alice@acme.com / acme1234</code>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Globe Ltd:</span>
              <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">bob@globeltd.com / globe1234</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
