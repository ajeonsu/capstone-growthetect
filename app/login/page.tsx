'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import ShinyText from '@/components/ShinyText';
import LogoSplash from '@/components/LogoSplash';

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

  if (showSplash) return <LogoSplash />;

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
        window.location.href = data.redirect;
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
        body: JSON.stringify({ email: pendingEmail, code: twoFACode }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Invalid verification code.');
        return;
      }

      if (data.success && data.redirect) {
        window.location.href = data.redirect;
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
    <div className="gradient-bg min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Title pinned absolutely to top — only on 2FA step */}
      {step === '2fa' && (
        <div className="absolute top-10 left-0 right-0 text-center z-10">
          <h1 className="font-extrabold text-white mb-2" style={{ fontSize: '54px', lineHeight: '1.1' }}>
            <ShinyText text="GROWTH" color="#86efac" shineColor="#ffffff" speed={3} /><span className="text-white">etect</span>
          </h1>
          <p className="text-sm text-gray-300 opacity-80">Your Smart Partner in Student Growth Monitoring</p>
        </div>
      )}
      <div className="login-card w-full max-w-md relative z-10 mx-auto">
        {/* Title Section — only on credentials step */}
        {step === 'credentials' && (
          <div className="text-center mb-6">
            <h1 className="font-extrabold text-white mb-2" style={{ fontSize: '54px', lineHeight: '1.1' }}>
              <ShinyText text="GROWTH" color="#86efac" shineColor="#ffffff" speed={3} /><span className="text-white">etect</span>
            </h1>
            <p className="text-sm text-gray-300 opacity-80">Your Smart Partner in Student Growth Monitoring</p>
          </div>
        )}

        {/* User Avatar — only shown on login step */}
        {step === 'credentials' && (
        <div className="user-avatar">
          <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-12 h-12 text-green-400">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        </div>
        )}

        {/* â”€â”€ STEP 1: Credentials â”€â”€ */}
        {step === 'credentials' && (
          <form onSubmit={handleSubmit}>
            <div className="input-wrapper">
              <div className="absolute left-0 top-1/2 transform -translate-y-1/2 text-green-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <input type="email" id="email" name="email" required placeholder="Email" className="input-field-with-icons" />
            </div>

            <div className="input-wrapper">
              <div className="absolute left-0 top-1/2 transform -translate-y-1/2 text-green-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                required
                placeholder="Password"
                className="input-field-with-icons"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 top-1/2 transform -translate-y-1/2 text-green-400 hover:text-green-300 transition-colors cursor-pointer focus:outline-none"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>

            {error && (
              <div className="text-sm px-4 py-3 rounded-lg mb-4 text-red-500 bg-transparent border-none">{error}</div>
            )}

            <button type="submit" disabled={loading} className="btn-login w-full font-semibold py-4 rounded-md text-lg">
              {loading ? 'Verifying...' : 'Login'}
            </button>

            <div className="text-center mt-4">
              <a href="/forgot-password" className="text-sm text-green-400 hover:text-green-300 transition-colors">
                Forgot Password?
              </a>
            </div>
          </form>
        )}

        {/* â”€â”€ STEP 2: 2FA Code â”€â”€ */}
        {step === '2fa' && (
          <form onSubmit={handleVerify2FA}>            <div className="user-avatar">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>            <div className="text-center mb-4">
              <h2 className="text-white text-xl font-bold mb-1">Two-Factor Authentication</h2>
              <p className="text-gray-300 text-sm">
                A 6-digit verification code was sent to<br />
                <span className="text-green-400 font-medium">{pendingEmail}</span>
              </p>
            </div>

            <div className="input-wrapper">
              <div className="absolute left-0 top-1/2 transform -translate-y-1/2 text-green-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                placeholder="Enter 6-digit code"
                value={twoFACode}
                onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, ''))}
                className="input-field-with-icons tracking-widest text-center text-lg font-bold"
                autoFocus
              />
            </div>

            {error && (
              <div className="text-sm px-4 py-3 rounded-lg mb-4 text-red-500 bg-transparent border-none">{error}</div>
            )}
            {resendMsg && (
              <div className="text-sm px-4 py-3 rounded-lg mb-4 text-green-400 bg-transparent border-none">{resendMsg}</div>
            )}

            <button type="submit" disabled={loading || twoFACode.length !== 6} className="btn-login w-full font-semibold py-4 rounded-md text-lg">
              {loading ? 'Verifying...' : 'Verify & Login'}
            </button>

            <div className="flex justify-between items-center mt-4">
              <button
                type="button"
                onClick={() => { setStep('credentials'); setError(''); setTwoFACode(''); setResendMsg(''); }}
                className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <button
                type="button"
                onClick={handleResendCode}
                disabled={resendLoading}
                className="text-sm text-green-400 hover:text-green-300 transition-colors"
              >
                {resendLoading ? 'Sending...' : 'Resend Code'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
