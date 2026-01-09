'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    console.log('[FRONTEND] Starting login request...');
    
    try {
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('[FRONTEND] Request timeout triggered');
        controller.abort();
      }, 10000); // 10 second timeout

      console.log('[FRONTEND] Sending fetch request...');
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        credentials: 'include', // Ensure cookies are included
        redirect: 'follow', // Follow redirects automatically
      });

      clearTimeout(timeoutId);
      console.log('[FRONTEND] Response received, status:', response.status);
      console.log('[FRONTEND] Response URL:', response.url);

      // If we get a redirect (303), the browser should handle it automatically
      // But if status is 200-299, check for JSON response
      if (response.status >= 200 && response.status < 300) {
        // Check if response is JSON or redirect
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          // JSON response (error case)
          const data = await response.json();
          if (data.success) {
            // Shouldn't happen with server redirect, but handle it
            window.location.href = data.redirect || '/nutritionist-overview';
            return;
          } else {
            setError(data.message || 'Login failed');
            setLoading(false);
            return;
          }
        }
      }

      // If we get here, it's likely a redirect that the browser handled
      // Or an error status
      if (response.status >= 300 && response.status < 400) {
        // Redirect response - browser should handle it, but if not, check Location header
        const location = response.headers.get('Location');
        if (location) {
          console.log('[FRONTEND] Redirect location:', location);
          window.location.href = location;
        }
        return;
      }

      // Error response
      if (!response.ok) {
        let errorMessage = 'Login failed';
        try {
          const data = await response.json();
          errorMessage = data.message || errorMessage;
        } catch (e) {
          // Not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        setError(errorMessage);
        setLoading(false);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setError('Request timed out. Please check your connection and try again.');
      } else {
        console.error('Login error:', error);
        setError(error.message || 'An error occurred. Please try again.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="gradient-bg min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="login-card w-full max-w-md relative z-10 mx-auto">
        {/* Title Section */}
        <div className="text-center mb-6">
          <h1 className="font-extrabold text-white mb-2" style={{ fontSize: '54px', lineHeight: '1.1' }}>
            <span className="text-green-400">GROWTH</span>etect
          </h1>
          <p className="text-sm text-gray-300 opacity-80">Your Smart Partner in Student Growth Monitoring</p>
        </div>

        {/* User Avatar */}
        <div className="user-avatar">
          <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-12 h-12 text-green-400">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Email Field */}
          <div className="input-wrapper">
            <input
              type="email"
              id="email"
              name="email"
              required
              placeholder="Email"
              className="input-field"
            />
            <div className="absolute right-0 top-1/2 transform -translate-y-1/2 text-green-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>

          {/* Password Field */}
          <div className="input-wrapper">
            <input
              type="password"
              id="password"
              name="password"
              required
              placeholder="Password"
              className="input-field"
            />
            <div className="absolute right-0 top-1/2 transform -translate-y-1/2 text-green-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-sm px-4 py-3 rounded-lg mb-4 text-red-500 bg-transparent border-none">
              {error}
            </div>
          )}

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="btn-login w-full font-semibold py-4 rounded-md text-lg"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {/* Create Account Section */}
        <div className="mt-6 text-center">
          <p className="text-gray-300 text-sm mb-2">Doesn't have an account?</p>
          <a href="/signup" className="inline-block px-8 py-2 border border-gray-400 rounded-full text-white transition hover:border-white hover:bg-white hover:bg-opacity-10">
            Create account
          </a>
        </div>
      </div>
    </div>
  );
}
