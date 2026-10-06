import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navLinks = [
    { to: '/requests', label: 'Requests' },
    { to: '/work-items', label: 'Work Items' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo & Nav */}
            <div className="flex items-center gap-8">
              <Link to="/requests" className="text-lg font-bold text-blue-600">
                📋 Request Desk
              </Link>
              <nav className="hidden sm:flex gap-1">
                {navLinks.map((link) => {
                  const active = location.pathname.startsWith(link.to);
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        active
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* User info */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.workspaceName}</p>
              </div>
              <button
                onClick={() => void handleLogout()}
                className="text-sm text-gray-600 hover:text-red-600 transition-colors px-3 py-1.5 rounded-md hover:bg-red-50"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile nav */}
      <div className="sm:hidden bg-white border-b px-4 py-2 flex gap-2">
        {navLinks.map((link) => {
          const active = location.pathname.startsWith(link.to);
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex-1 text-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                active
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
