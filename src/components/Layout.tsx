import React from 'react';
import { LogOut, Target, BarChart3 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: 'dashboard' | 'goals' | 'analytics';
  onNavigate: (page: 'dashboard' | 'goals' | 'analytics') => void;
}

export function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  const navItems = [
    { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { key: 'goals', label: 'Goals', icon: Target },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  ] as const;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Target className="h-8 w-8 text-indigo-600" />
              <h1 className="text-2xl font-bold text-gray-900">GoalSync</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {user?.user_metadata?.full_name || user?.email}
              </span>
              <button
                onClick={handleSignOut}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white/60 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {navItems.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => onNavigate(key)}
                className={`inline-flex items-center px-1 pt-4 pb-3 text-sm font-medium border-b-2 transition-colors ${
                  currentPage === key
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white/80 backdrop-blur-sm border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-center items-center text-sm text-gray-600">
            <span>Built with</span>
            <a
              href="https://bolt.new"
              target="_blank"
              rel="noopener noreferrer"
              className="mx-1 font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              Bolt.new
            </a>
            <span>⚡</span>
          </div>
        </div>
      </footer>
    </div>
  );
}