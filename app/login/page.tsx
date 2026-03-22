'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import ShinyText from '@/components/ShinyText';
import LogoSplash from '@/components/LogoSplash';
import PixelCard from '@/components/PixelCard';

export default function LoginPage() {
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // 2FA state
  const [step, setStep] = useState<'credentials' | '2fa'>('credentials');
  const [pendingEmail, setPendingEmail] = useState('');
  const [twoFACode, setTwoFACode] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 3000);
    return () => clearTimeout(t);
  }, []);

  // If the user is already authenticated (e.g. hit the back button), redirect them forward
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.user) {
          const dest = data.user.role === 'admin' ? '/admin/dashboard' : '/nutritionist-overview';
          window.location.replace(dest);
        }
      })
      .catch(() => {}); // not logged in — stay on login page
  }, []);

  if (showSplash) return <LogoSplash noLogo />;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        credentials: 'include',
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Login failed');
        return;
      }

      if (data.requires2FA) {
        setPendingEmail(data.email);
        setStep('2fa');
        return;
      }

      // Fallback: direct login without 2FA (shouldn't happen)
      if (data.success && data.redirect) {
        window.location.replace(data.redirect);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setError('Request timed out. Please check your connection and try again.');
      } else {
        setError(error.message || 'An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: pendingEmail, code: twoFACode.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Invalid verification code.');
        return;
      }

      if (data.success && data.redirect) {
        window.location.replace(data.redirect);
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResendMsg('');
    setError('');
    setResendLoading(true);
    try {
      const res = await fetch('/api/auth/2fa/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        setResendMsg('A new code has been sent to your email.');
        setTwoFACode('');
      } else {
        setError(data.message || 'Failed to resend code.');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div
      className="gradient-bg min-h-screen min-h-[100dvh] flex items-center justify-center relative overflow-hidden"
      style={{ padding: 'max(1.5rem, env(safe-area-inset-top)) max(1.5rem, env(safe-area-inset-right)) max(1.5rem, env(safe-area-inset-bottom)) max(1.5rem, env(safe-area-inset-left))' }}
    >
      {/* ── CREDENTIALS STEP ── */}
      {step === 'credentials' && (
        <div className="login-split-card w-full max-w-4xl flex flex-col sm:flex-row relative z-10" style={{ minHeight: 520 }}>

          {/* LEFT PANEL */}
          <div className="login-left-panel flex flex-col items-center justify-center px-8 py-12 sm:w-[42%] gap-6">
            {/* Decorative ring */}
            <div className="relative flex items-center justify-center">
              <div style={{
                position: 'absolute',
                width: 290,
                height: 290,
                borderRadius: '50%',
                border: '1px solid rgba(34,197,94,0.15)',
              }} />
              <div style={{
                position: 'absolute',
                width: 330,
                height: 330,
                borderRadius: '50%',
                border: '1px solid rgba(34,197,94,0.07)',
              }} />
              <PixelCard
                variant="blue"
                gap={3}
                speed={40}
                colors="#bfdbfe,#93c5fd,#60a5fa,#3b82f6,#e0f2fe"
                noFocus
                style={{ width: 240, height: 240, borderRadius: '50%' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo.png"
                  alt="GROWTHetect Logo"
                  style={{ width: 240, height: 240, objectFit: 'contain', position: 'relative', zIndex: 1, pointerEvents: 'none' }}
                />
              </PixelCard>
            </div>

            {/* System name on left panel */}
            <div className="text-center relative z-10">
              <h1 className="login-brand-title" style={{ fontSize: 'clamp(1.6rem, 5vw, 2.2rem)' }}>
                <ShinyText text="GROWTH" color="#4ade80" shineColor="#ffffff" speed={3} />
                <span style={{ color: '#ffffff' }}>etect</span>
              </h1>
              <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Your Smart Partner in<br />Student Growth Monitoring
              </p>
            </div>


          </div>

          {/* RIGHT PANEL */}
          <div className="login-right-panel flex flex-col justify-center px-8 py-10 sm:w-[58%]">
            {/* Header */}
            <div className="mb-7">
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'rgba(74,222,128,0.7)' }}>
                NUTRITIONIST / ADMINISTRATOR PORTAL
              </p>
              <h2 className="login-brand-title text-white" style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)' }}>
                Welcome back
              </h2>
              <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Sign in to your account to continue
              </p>
            </div>

            <form onSubmit={handleSubmit} className="w-full space-y-4">
              {/* Email */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.55)' }}>Email Address</label>
                <div className="input-wrapper" style={{ marginBottom: 0 }}>
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-green-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input type="email" name="email" required placeholder="Enter your email" className="input-field-with-icons" />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.55)' }}>Password</label>
                <div className="input-wrapper" style={{ marginBottom: 0 }}>
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-green-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    required
                    placeholder="Enter your password"
                    className="input-field-with-icons"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-green-400 hover:text-green-300 transition-colors focus:outline-none"
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Forgot password */}
              <div className="flex justify-end">
                <a href="/forgot-password" className="text-xs font-medium transition-colors" style={{ color: 'rgba(74,222,128,0.8)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#4ade80')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(74,222,128,0.8)')}>
                  Forgot Password?
                </a>
              </div>

              {error && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-login w-full py-3 text-sm mt-2"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Signing in...
                  </span>
                ) : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── 2FA STEP ── */}
      {step === '2fa' && (
        <div className="login-split-card w-full max-w-md relative z-10 p-8">
          {/* Title */}
          <div className="text-center mb-6">
            <h1 className="login-brand-title mb-1" style={{ fontSize: '1.75rem' }}>
              <ShinyText text="GROWTH" color="#4ade80" shineColor="#ffffff" speed={3} />
              <span style={{ color: '#ffffff' }}>etect</span>
            </h1>
            <div className="login-divider" />
            <div className="user-avatar mt-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-9 h-9 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h2 className="text-white text-lg font-bold mt-3">Two-Factor Authentication</h2>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
              A 6-digit code was sent to
            </p>
            <p className="text-sm font-semibold mt-0.5" style={{ color: '#4ade80' }}>{pendingEmail}</p>
          </div>

          <form onSubmit={handleVerify2FA} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.55)' }}>Verification Code</label>
              <div className="input-wrapper" style={{ marginBottom: 0 }}>
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-green-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  placeholder="_ _ _ _ _ _"
                  value={twoFACode}
                  onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, ''))}
                  className="input-field-with-icons tracking-[0.5em] text-center text-lg font-bold"
                  autoFocus
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {error}
              </div>
            )}
            {resendMsg && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#86efac' }}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {resendMsg}
              </div>
            )}

            <button type="submit" disabled={loading || twoFACode.length !== 6} className="btn-login w-full py-3 text-sm">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Verifying...
                </span>
              ) : 'Verify & Sign In'}
            </button>

            <div className="flex justify-between items-center pt-1">
              <button
                type="button"
                onClick={() => { setStep('credentials'); setError(''); setTwoFACode(''); setResendMsg(''); }}
                className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors"
                style={{ color: 'rgba(255,255,255,0.45)' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to login
              </button>
              <button
                type="button"
                onClick={handleResendCode}
                disabled={resendLoading}
                className="text-xs font-medium transition-colors"
                style={{ color: 'rgba(74,222,128,0.8)' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#4ade80')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(74,222,128,0.8)')}
              >
                {resendLoading ? 'Sending...' : 'Resend Code'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
