import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { useCompanySettings, NEUTRAL_TENANT_LOGO } from '../context/CompanySettingsContext.js';

interface LoginBrand {
  name: string;
  slug: string;
  tagline: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  isOoting: boolean;
}

const defaultOotingBrand: LoginBrand = {
  name: 'Ooting',
  slug: 'ooting',
  tagline: 'Journeys Beyond Ordinary',
  logoUrl: '/assets/ooting-logo.jpg',
  primaryColor: '#C91F28',
  secondaryColor: '#1E3A8A',
  isOoting: true,
};

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { updateCompany } = useCompanySettings();

  const [brand, setBrand] = useState<LoginBrand>(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tenantParam = searchParams.get('tenant') || searchParams.get('company');
    const rememberedSlug = tenantParam || localStorage.getItem('crm_last_tenant');
    if (rememberedSlug && rememberedSlug !== 'ooting') {
      return {
        name: rememberedSlug.replace(/-/g, ' ').toUpperCase(),
        slug: rememberedSlug,
        tagline: '',
        logoUrl: '',
        primaryColor: '#2563eb',
        secondaryColor: '#1e40af',
        isOoting: false,
      };
    }
    return defaultOotingBrand;
  });

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load tenant branding from URL parameter or remembered slug on mount
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tenantParam = searchParams.get('tenant') || searchParams.get('company');
    const slugToLoad = tenantParam || localStorage.getItem('crm_last_tenant');

    if (slugToLoad) {
      api.get(`/auth/company-branding?slug=${encodeURIComponent(slugToLoad)}`)
        .then((res) => {
          if (res.data?.name) {
            setBrand(res.data);
          }
        })
        .catch(() => {});
    }
  }, []);

  // Dynamically resolve tenant branding when user enters their work email/phone
  useEffect(() => {
    const clean = identifier.trim();
    if (!clean || clean.length < 4) return;

    const timer = setTimeout(() => {
      api.get(`/auth/company-branding?identifier=${encodeURIComponent(clean)}`)
        .then((res) => {
          if (res.data?.name) {
            setBrand(res.data);
          }
        })
        .catch(() => {});
    }, 350);

    return () => clearTimeout(timer);
  }, [identifier]);

  // Synchronize document tab title
  useEffect(() => {
    document.title = `${brand.name} | CRM Login`;
  }, [brand.name]);

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
        if (res.data?.company) {
          updateCompany(res.data.company);
          if (res.data.company.slug) {
            localStorage.setItem('crm_last_tenant', res.data.company.slug);
          }
        }
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

  const effectiveLogo = brand.logoUrl || (brand.isOoting ? '/assets/ooting-logo.jpg' : NEUTRAL_TENANT_LOGO);

  return (
    <div className="min-h-screen bg-slate-900 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden transition-colors">
      {/* Background Accent Wave (Only shown for primary Ooting tenant) */}
      {brand.isOoting && (
        <div className="absolute top-0 left-0 right-0 opacity-10 pointer-events-none">
          <img src="/assets/ooting-header-wave.png" alt="" className="w-full h-auto" />
        </div>
      )}

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex flex-col items-center justify-center">
          <div
            className="w-20 h-20 rounded-2xl bg-white p-2 shadow-xl border border-slate-700 flex items-center justify-center mb-4 transition-all duration-300"
            style={{
              borderTopColor: brand.primaryColor || '#2563eb',
              borderTopWidth: '3px',
            }}
          >
            <img
              src={effectiveLogo}
              alt={brand.name}
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = brand.isOoting ? '/assets/ooting-logo.jpg' : NEUTRAL_TENANT_LOGO;
              }}
            />
          </div>
          <h2 className="text-center text-2xl font-bold tracking-tight text-white uppercase">
            {brand.name} CRM
          </h2>
          {brand.tagline ? (
            <p
              className="text-center text-xs font-semibold tracking-wider mt-1 uppercase"
              style={{ color: brand.primaryColor || '#2563eb' }}
            >
              {brand.tagline}
            </p>
          ) : (
            <p className="text-center text-xs font-semibold tracking-wider text-slate-400 mt-1 uppercase">
              Member Workspace
            </p>
          )}
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
                  placeholder="Enter your work email or phone number"
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
                style={{
                  backgroundColor: brand.primaryColor || '#C91F28',
                }}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-50 cursor-pointer hover:opacity-90"
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
