import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogIn,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  ArrowLeft,
  ShieldCheck,
  KeyRound,
  Clock,
  RotateCw,
} from 'lucide-react';
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

type AuthStep =
  | 'CREDENTIALS'
  | 'LOGIN_OTP'
  | 'FORGOT_REQUEST'
  | 'RESET_OTP'
  | 'NEW_PASSWORD'
  | 'RESET_SUCCESS';

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

  // State Machine
  const [authStep, setAuthStep] = useState<AuthStep>('CREDENTIALS');

  // Input states
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [otp, setOtp] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetToken, setResetToken] = useState('');

  // Status & Feedback
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Timers
  const [otpExpirySeconds, setOtpExpirySeconds] = useState(300); // 5 minutes
  const [resendCooldown, setResendCooldown] = useState(30); // 30 seconds

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

  // Expiry & Cooldown Timers
  useEffect(() => {
    if (authStep !== 'LOGIN_OTP' && authStep !== 'RESET_OTP') return;

    const timer = setInterval(() => {
      setOtpExpirySeconds((prev) => (prev > 0 ? prev - 1 : 0));
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [authStep]);

  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // ---------------------------------------------------------------------------
  // Action Handlers
  // ---------------------------------------------------------------------------

  // 1. Initial Credentials Submit -> Initiates Email OTP Challenge
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) return;

    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const res = await api.post('/auth/login', {
        identifier: identifier.trim(),
        password,
      });

      if (res.data?.requireOtp) {
        setMaskedEmail(res.data.maskedEmail || res.data.identifier || identifier);
        setOtp('');
        setOtpExpirySeconds(300);
        setResendCooldown(30);
        setAuthStep('LOGIN_OTP');
        setSuccessMessage(res.data.message || 'Verification code sent to your registered email.');
      } else if (res.data?.token) {
        // Direct session fallback if configured
        login(res.data.token, res.data.user);
        if (res.data?.company) {
          updateCompany(res.data.company);
          if (res.data.company.slug) {
            localStorage.setItem('crm_last_tenant', res.data.company.slug);
          }
        }
        navigate('/');
      } else {
        setError('Unexpected authentication response. Please try again.');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(
        err.response?.data?.message || 'Invalid email/employee ID or password. Please verify your credentials.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Verify Login Email OTP -> Finalizes Session
  const handleVerifyLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim() || otp.trim().length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    if (otpExpirySeconds <= 0) {
      setError('Verification code has expired. Please request a new code.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const res = await api.post('/auth/verify-otp', {
        identifier: identifier.trim(),
        otp: otp.trim(),
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
        setError('Failed to establish session. Please try again.');
      }
    } catch (err: any) {
      console.error('Verify OTP error:', err);
      setError(err.response?.data?.message || 'Invalid verification code. Please check and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Resend OTP (for Login or Password Reset)
  const handleResendOtp = async (purpose: 'LOGIN' | 'PASSWORD_RESET') => {
    if (resendCooldown > 0 || isLoading) return;

    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const res = await api.post('/auth/resend-otp', {
        identifier: identifier.trim(),
        purpose,
      });

      setOtpExpirySeconds(300);
      setResendCooldown(30);
      setOtp('');
      setSuccessMessage(res.data?.message || 'A fresh verification code has been dispatched to your email.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend verification code. Please wait and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Request Password Reset -> Dispatches Reset Code
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError('Please enter your work email or employee ID.');
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const res = await api.post('/auth/forgot-password', {
        identifier: identifier.trim(),
      });

      setMaskedEmail(res.data?.maskedEmail || identifier);
      setOtp('');
      setOtpExpirySeconds(300);
      setResendCooldown(30);
      setAuthStep('RESET_OTP');
      setSuccessMessage(res.data?.message || 'A password reset code has been sent to your registered email.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit reset request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Verify Password Reset OTP -> Exchanges for Reset Token
  const handleVerifyResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim() || otp.trim().length !== 6) {
      setError('Please enter the complete 6-digit reset code.');
      return;
    }

    if (otpExpirySeconds <= 0) {
      setError('The reset code has expired. Please request a new code.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const res = await api.post('/auth/verify-reset-otp', {
        identifier: identifier.trim(),
        otp: otp.trim(),
      });

      if (res.data?.resetToken) {
        setResetToken(res.data.resetToken);
        setNewPassword('');
        setConfirmPassword('');
        setAuthStep('NEW_PASSWORD');
        setSuccessMessage(null);
      } else {
        setError('Verification failed. Please request a new code.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid or expired reset code.');
    } finally {
      setIsLoading(false);
    }
  };

  // 6. Submit New Password
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError('Password must contain at least one letter and one number.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify both fields.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const res = await api.post('/auth/reset-password', {
        resetToken,
        newPassword,
      });

      setSuccessMessage(res.data?.message || 'Password updated successfully!');
      setAuthStep('RESET_SUCCESS');
      setPassword('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset to initial screen
  const handleBackToLogin = () => {
    setError(null);
    setSuccessMessage(null);
    setOtp('');
    setAuthStep('CREDENTIALS');
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

      {/* Brand Header */}
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

      {/* Card Container */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-200 dark:border-slate-800 transition-colors">

          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl flex items-start gap-2.5 text-xs text-[#C91F28] dark:text-red-400 font-medium leading-relaxed">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Banner */}
          {successMessage && (
            <div className="mb-5 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-xl flex items-start gap-2.5 text-xs text-emerald-700 dark:text-emerald-400 font-medium leading-relaxed">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* ============================================================= */}
          {/* SCREEN 1: CREDENTIALS (Existing Login Screen)                 */}
          {/* ============================================================= */}
          {authStep === 'CREDENTIALS' && (
            <form className="space-y-5" onSubmit={handleCredentialsSubmit}>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                  Work Email or Employee ID
                </label>
                <div className="mt-1.5">
                  <input
                    type="text"
                    required
                    autoFocus
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Enter your registered email or ID"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#C91F28] transition-colors font-medium"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setSuccessMessage(null);
                      setAuthStep('FORGOT_REQUEST');
                    }}
                    className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-[#C91F28] dark:hover:text-red-400 transition-colors cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
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
                  style={{ backgroundColor: brand.primaryColor || '#C91F28' }}
                  className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-50 cursor-pointer hover:opacity-90"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying Credentials...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Sign In</span>
                    </>
                  )}
                </button>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  New employee? Please contact your administrator to get login access.
                </p>
              </div>
            </form>
          )}

          {/* ============================================================= */}
          {/* SCREEN 2: LOGIN_OTP (Two-Factor Email OTP Screen)             */}
          {/* ============================================================= */}
          {authStep === 'LOGIN_OTP' && (
            <form className="space-y-5" onSubmit={handleVerifyLoginOtp}>
              <div className="text-center pb-1">
                <div className="w-12 h-12 mx-auto rounded-full bg-red-50 dark:bg-red-950/40 flex items-center justify-center text-[#C91F28] dark:text-red-400 mb-3">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Two-Factor Email Verification
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Enter the 6-digit verification code sent to <br />
                  <strong className="text-slate-700 dark:text-slate-200 font-semibold">{maskedEmail}</strong>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide text-center">
                  6-Digit Verification Code
                </label>
                <div className="mt-2">
                  <input
                    type="text"
                    required
                    autoFocus
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••••"
                    className="w-full text-center text-2xl font-bold tracking-[0.5em] py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C91F28] transition-colors font-mono"
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Expires in: <strong className={otpExpirySeconds < 60 ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}>{formatTime(otpExpirySeconds)}</strong>
                  </span>
                  <button
                    type="button"
                    disabled={resendCooldown > 0 || isLoading}
                    onClick={() => handleResendOtp('LOGIN')}
                    className="flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-[#C91F28] dark:hover:text-red-400 font-semibold disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-colors"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>{resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend Code'}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  disabled={isLoading || otp.trim().length !== 6 || otpExpirySeconds <= 0}
                  style={{ backgroundColor: brand.primaryColor || '#C91F28' }}
                  className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-50 cursor-pointer hover:opacity-90"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying Code...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verify & Continue</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="w-full flex justify-center items-center gap-1.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </button>
              </div>
            </form>
          )}

          {/* ============================================================= */}
          {/* SCREEN 3: FORGOT_REQUEST (Forgot Password Form)               */}
          {/* ============================================================= */}
          {authStep === 'FORGOT_REQUEST' && (
            <form className="space-y-5" onSubmit={handleForgotPasswordSubmit}>
              <div className="text-center pb-1">
                <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-3">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Reset Account Password
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Enter your registered work email or employee ID to receive a secure recovery code.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                  Work Email or Employee ID
                </label>
                <div className="mt-1.5">
                  <input
                    type="text"
                    required
                    autoFocus
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Enter your registered email or ID"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#C91F28] transition-colors font-medium"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  disabled={isLoading || !identifier.trim()}
                  style={{ backgroundColor: brand.primaryColor || '#C91F28' }}
                  className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-50 cursor-pointer hover:opacity-90"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending Reset Code...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>Send Reset Code</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="w-full flex justify-center items-center gap-1.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </button>
              </div>
            </form>
          )}

          {/* ============================================================= */}
          {/* SCREEN 4: RESET_OTP (Verify Password Reset Code)              */}
          {/* ============================================================= */}
          {authStep === 'RESET_OTP' && (
            <form className="space-y-5" onSubmit={handleVerifyResetOtp}>
              <div className="text-center pb-1">
                <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-3">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Verify Reset Code
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Enter the 6-digit password reset code sent to <br />
                  <strong className="text-slate-700 dark:text-slate-200 font-semibold">{maskedEmail}</strong>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide text-center">
                  6-Digit Reset Code
                </label>
                <div className="mt-2">
                  <input
                    type="text"
                    required
                    autoFocus
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••••"
                    className="w-full text-center text-2xl font-bold tracking-[0.5em] py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C91F28] transition-colors font-mono"
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Expires in: <strong className={otpExpirySeconds < 60 ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}>{formatTime(otpExpirySeconds)}</strong>
                  </span>
                  <button
                    type="button"
                    disabled={resendCooldown > 0 || isLoading}
                    onClick={() => handleResendOtp('PASSWORD_RESET')}
                    className="flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-[#C91F28] dark:hover:text-red-400 font-semibold disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-colors"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>{resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend Code'}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  disabled={isLoading || otp.trim().length !== 6 || otpExpirySeconds <= 0}
                  style={{ backgroundColor: brand.primaryColor || '#C91F28' }}
                  className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-50 cursor-pointer hover:opacity-90"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying Code...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verify Code</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="w-full flex justify-center items-center gap-1.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </button>
              </div>
            </form>
          )}

          {/* ============================================================= */}
          {/* SCREEN 5: NEW_PASSWORD (Create New Password)                  */}
          {/* ============================================================= */}
          {authStep === 'NEW_PASSWORD' && (
            <form className="space-y-5" onSubmit={handleResetPasswordSubmit}>
              <div className="text-center pb-1">
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Set New Password
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Choose a secure password with at least 8 characters, including letters and numbers.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                  New Password
                </label>
                <div className="mt-1.5 relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    autoFocus
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full px-3.5 py-2.5 pr-11 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#C91F28] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                  Confirm New Password
                </label>
                <div className="mt-1.5 relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full px-3.5 py-2.5 pr-11 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#C91F28] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-[11px] text-red-500 mt-1 font-medium">
                    Passwords do not match.
                  </p>
                )}
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  disabled={isLoading || newPassword.length < 8 || newPassword !== confirmPassword}
                  style={{ backgroundColor: brand.primaryColor || '#C91F28' }}
                  className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-50 cursor-pointer hover:opacity-90"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Update Password</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="w-full flex justify-center items-center gap-1.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </button>
              </div>
            </form>
          )}

          {/* ============================================================= */}
          {/* SCREEN 6: RESET_SUCCESS (Password Reset Success Screen)       */}
          {/* ============================================================= */}
          {authStep === 'RESET_SUCCESS' && (
            <div className="space-y-5 text-center py-2">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Password Updated Successfully!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  Your password has been securely updated. You can now log in using your new password and email verification code.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleBackToLogin}
                  style={{ backgroundColor: brand.primaryColor || '#C91F28' }}
                  className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors cursor-pointer hover:opacity-90"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Proceed to Sign In</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Login;
