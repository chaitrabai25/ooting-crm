import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) return;

    setError(null);
    setIsLoading(true);

    try {
      const res = await api.post('/auth/login', {
        identifier: identifier.trim(),
        password,
      });

      if (res.data?.token) {
        login(res.data.token, res.data.user);
        navigate('/');
      } else {
        setError('Authentication response invalid. Please try again.');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(
        err.response?.data?.message || 'Invalid email/phone or password. Please verify your credentials.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden transition-colors">
      {/* Background Subtle Wave Accents */}
      <div className="absolute top-0 left-0 right-0 opacity-10 pointer-events-none">
        <img src="/assets/ooting-header-wave.png" alt="" className="w-full h-auto" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex flex-col items-center justify-center">
          <div className="w-20 h-20 rounded-2xl bg-white p-2 shadow-xl border border-slate-700 flex items-center justify-center mb-4">
            <img
              src="/assets/ooting-logo.jpg"
              alt="Ooting Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h2 className="text-center text-2xl font-bold tracking-tight text-white">
            OOTING CRM
          </h2>
          <p className="text-center text-xs font-semibold tracking-wider text-[#C91F28] mt-1 uppercase">
            Journeys Beyond Ordinary
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-200 dark:border-slate-800 transition-colors">
          
          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl flex items-center gap-2.5 text-xs text-[#C91F28] dark:text-red-400 font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Quick Super Admin Selector for fast testing */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl text-xs space-y-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wider block">
                Quick Select Super Admin:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setIdentifier('chaitrabaijr@gmail.com');
                    setPassword('Chaitra@25');
                  }}
                  className="px-2.5 py-1 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded-lg font-medium text-slate-800 dark:text-slate-200 transition-colors cursor-pointer text-[11px]"
                >
                  👑 chaitrabaijr@gmail.com
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIdentifier('8951233134');
                    setPassword('Chaitra@25');
                  }}
                  className="px-2.5 py-1 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded-lg font-medium text-slate-800 dark:text-slate-200 transition-colors cursor-pointer text-[11px]"
                >
                  📱 8951233134 (Phone)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                Email Address or Phone Number
              </label>
              <div className="mt-1.5">
                <input
                  type="text"
                  required
                  autoFocus
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. admin@ooting.com or 8951233134"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#C91F28] transition-colors font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                Password
              </label>
              <div className="mt-1.5 relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 pr-11 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#C91F28] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  tabIndex={-1}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="submit"
                disabled={isLoading || !identifier.trim() || !password}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-[#C91F28] hover:bg-[#a81920] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#C91F28] transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Sign In</span>
                  </>
                )}
              </button>
            </div>

            {/* Non-Employee Registration Notice (PART 3) */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                New user? Please contact your administrator to get login access.
              </p>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
};

export default Login;
