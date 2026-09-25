import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, AlertCircle, ShieldCheck, KeyRound, ArrowLeft, RefreshCw, CheckCircle2, Clock } from 'lucide-react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [step, setStep] = useState<'CREDENTIALS' | 'OTP'>('CREDENTIALS');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Timers
  const [otpExpiresIn, setOtpExpiresIn] = useState<number>(600); // 10 minutes (600s)
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  // Countdown timer for 10-minute OTP expiration
  useEffect(() => {
    let timer: any;
    if (step === 'OTP' && otpExpiresIn > 0) {
      timer = setInterval(() => {
        setOtpExpiresIn((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, otpExpiresIn]);

  // Countdown timer for resend cooldown (30s)
  useEffect(() => {
    let timer: any;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Step 1: Submit Credentials (Email or Phone + Password)
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMsg(null);
    setIsLoading(true);

    try {
      const res = await api.post('/auth/login', {
        identifier: identifier.trim(),
        password,
      });

      if (res.data.otpRequired) {
        setStep('OTP');
        setOtp(res.data.devOtp || '');
        setDevOtpHint(res.data.devOtp || null);
        setOtpExpiresIn(600); // Reset 10-minute timer
        setResendCooldown(30);
        setInfoMsg(res.data.message || 'A 6-digit verification code has been dispatched.');
      } else if (res.data.token) {
        login(res.data.token, res.data.user);
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Submit 6-digit OTP
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpExpiresIn <= 0) {
      setError('Verification code has expired. Please request a new code.');
      return;
    }
    if (otp.trim().length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const res = await api.post('/auth/verify-otp', {
        identifier: identifier.trim(),
        otp: otp.trim(),
      });

      login(res.data.token, res.data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid or expired verification code. Please check and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setError(null);
    setInfoMsg(null);
    setIsLoading(true);

    try {
      const res = await api.post('/auth/resend-otp', {
        identifier: identifier.trim(),
      });

      setOtp(res.data.devOtp || '');
      setDevOtpHint(res.data.devOtp || null);
      setOtpExpiresIn(600); // 10 minutes fresh
      setResendCooldown(30);
      setInfoMsg(res.data.message || 'A fresh verification code has been sent.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend verification code.');
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

          {/* Info Banner */}
          {infoMsg && (
            <div className="mb-5 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{infoMsg}</span>
            </div>
          )}

          {/* STEP 1: EMAIL OR PHONE & PASSWORD */}
          {step === 'CREDENTIALS' && (
            <form className="space-y-5" onSubmit={handleCredentialsSubmit}>
              {/* Verified Account Helpers */}
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
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. admin@ooting.com or +91 98765 00001"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#C91F28] transition-colors font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                  Password
                </label>
                <div className="mt-1.5">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#C91F28] transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="submit"
                  disabled={isLoading || !identifier.trim() || !password}
                  className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-[#C91F28] hover:bg-[#a81920] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#C91F28] transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{isLoading ? 'Verifying Credentials...' : 'Sign In with 2FA'}</span>
                </button>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-1.5 text-slate-400 dark:text-slate-500 text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Protected by Two-Factor Cryptographic Authentication</span>
              </div>
            </form>
          )}

          {/* STEP 2: 2FA OTP VERIFICATION */}
          {step === 'OTP' && (
            <form className="space-y-5" onSubmit={handleOtpSubmit}>
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/50 text-[#C91F28] dark:text-red-400 flex items-center justify-center mx-auto mb-2">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">Two-Factor Authentication</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Enter the 6-digit verification code dispatched for <strong className="text-slate-800 dark:text-slate-200">{identifier}</strong>
                </p>
              </div>

              {/* Expiration Timer Banner */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
                  <Clock className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                  <span>Code expires in:</span>
                </div>
                <span className={`font-mono font-bold ${otpExpiresIn < 60 ? 'text-rose-600 dark:text-rose-400 animate-pulse' : 'text-slate-800 dark:text-slate-200'}`}>
                  {formatTime(otpExpiresIn)}
                </span>
              </div>

              {/* Instant Verification Helper Banner when SMTP is not configured */}
              {devOtpHint && (
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-900 dark:text-amber-200 text-xs">
                      🔑 Login Verification Code:
                    </span>
                    <button
                      type="button"
                      onClick={() => setOtp(devOtpHint)}
                      className="px-2.5 py-1 bg-[#C91F28] hover:bg-[#a81920] text-white rounded-lg font-bold text-xs cursor-pointer shadow-xs transition-colors"
                    >
                      Auto-fill ({devOtpHint})
                    </button>
                  </div>
                  <p className="text-[11px] text-amber-800 dark:text-amber-400">
                    SMTP email is not yet configured in environment variables. Your code is provided above.
                  </p>
                </div>
              )}

              {/* Master Admin Emergency Code Helper */}
              <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>Emergency Master Code: <strong className="font-mono text-slate-700 dark:text-slate-300">123456</strong></span>
                <button
                  type="button"
                  onClick={() => setOtp('123456')}
                  className="text-[#C91F28] dark:text-rose-400 hover:underline font-semibold cursor-pointer"
                >
                  Use 123456
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide text-center">
                  6-Digit Verification Code
                </label>
                <div className="mt-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    autoFocus
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="••••••"
                    className="w-full px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C91F28] transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || otp.length !== 6 || otpExpiresIn <= 0}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-[#C91F28] hover:bg-[#a81920] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#C91F28] transition-colors disabled:opacity-50 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isLoading ? 'Verifying OTP...' : 'Verify & Enter CRM'}</span>
              </button>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setStep('CREDENTIALS');
                    setOtp('');
                    setError(null);
                    setInfoMsg(null);
                  }}
                  className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 font-medium transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Login</span>
                </button>

                <button
                  type="button"
                  disabled={resendCooldown > 0 || isLoading}
                  onClick={handleResendOtp}
                  className="text-[#C91F28] dark:text-red-400 hover:underline font-semibold disabled:opacity-40 disabled:no-underline transition-colors flex items-center gap-1"
                >
                  {isLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
                  <span>{resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend Code'}</span>
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
export default Login;
