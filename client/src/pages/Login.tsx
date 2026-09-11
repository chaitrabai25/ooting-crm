import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, AlertCircle, ShieldCheck, KeyRound, ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [step, setStep] = useState<'CREDENTIALS' | 'OTP'>('CREDENTIALS');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Countdown timer for resend
  useEffect(() => {
    let timer: any;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Step 1: Submit Credentials
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMsg(null);
    setIsLoading(true);

    try {
      const res = await api.post('/auth/login', { email: email.trim(), password });
      if (res.data.otpRequired) {
        setStep('OTP');
        setDevOtpHint(res.data.devOtp || null);
        if (res.data.devOtp) {
          setOtp(res.data.devOtp);
        }
        setInfoMsg(res.data.message || 'Verification code generated.');
        setResendCooldown(30);
      } else if (res.data.token) {
        login(res.data.token, res.data.user);
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Submit OTP
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.trim().length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const res = await api.post('/auth/verify-otp', {
        email: email.trim(),
        otp: otp.trim(),
      });

      login(res.data.token, res.data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid or expired OTP code. Please check and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setError(null);
    setInfoMsg(null);

    try {
      const res = await api.post('/auth/resend-otp', { email: email.trim() });
      setDevOtpHint(res.data.devOtp || null);
      if (res.data.devOtp) {
        setOtp(res.data.devOtp);
      }
      setInfoMsg('A fresh verification code has been sent.');
      setResendCooldown(30);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend code.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
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
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-200">
          
          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-[#C91F28] font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Info Banner */}
          {infoMsg && (
            <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 font-medium">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
              <span>{infoMsg}</span>
            </div>
          )}

          {/* STEP 1: EMAIL & PASSWORD */}
          {step === 'CREDENTIALS' && (
            <form className="space-y-5" onSubmit={handleCredentialsSubmit}>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  Email Address
                </label>
                <div className="mt-1.5">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="staff@ooting.com"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C91F28] transition-colors font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  Password
                </label>
                <div className="mt-1.5">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C91F28] transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-[#C91F28] hover:bg-[#a81920] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#C91F28] transition-colors disabled:opacity-50 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>{isLoading ? 'Verifying...' : 'Sign In with 2FA'}</span>
              </button>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-slate-400 text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Encrypted session protected by Two-Factor Authentication</span>
              </div>
            </form>
          )}

          {/* STEP 2: 2FA OTP VERIFICATION */}
          {step === 'OTP' && (
            <form className="space-y-5" onSubmit={handleOtpSubmit}>
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#C91F28] flex items-center justify-center mx-auto mb-2">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 text-lg">Two-Factor Authentication</h3>
                <p className="text-xs text-slate-500">
                  Enter the 6-digit verification code generated for <strong className="text-slate-800">{email}</strong>
                </p>
              </div>

              {/* Development Mode Notice Badge */}
              {devOtpHint && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 space-y-1">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-emerald-800">🔑 Verification Code:</span>
                    <button
                      type="button"
                      onClick={() => setOtp(devOtpHint)}
                      className="text-[#C91F28] font-bold underline hover:text-[#a81920] cursor-pointer"
                    >
                      Auto-fill ({devOtpHint})
                    </button>
                  </div>
                  <p className="text-emerald-700 text-[10px]">
                    Code generated securely. It is auto-filled above—click "Verify & Sign In" below to access your CRM.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide text-center">
                  6-Digit Verification Code
                </label>
                <div className="mt-2">
                  <input
                    type="text"
                    maxLength={6}
                    autoFocus
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="••••••"
                    className="w-full px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] font-bold bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C91F28] transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || otp.length !== 6}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-[#C91F28] hover:bg-[#a81920] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#C91F28] transition-colors disabled:opacity-50 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isLoading ? 'Verifying OTP...' : 'Verify & Enter CRM'}</span>
              </button>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setStep('CREDENTIALS');
                    setOtp('');
                    setError(null);
                    setInfoMsg(null);
                  }}
                  className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Login</span>
                </button>

                <button
                  type="button"
                  disabled={resendCooldown > 0}
                  onClick={handleResendOtp}
                  className="text-[#C91F28] hover:underline font-semibold disabled:opacity-40 disabled:no-underline transition-colors"
                >
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend Code'}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
