'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    
    try {
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 10000); // 10 second timeout

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        credentials: 'include', // Ensure cookies are included
        redirect: 'follow', // Follow redirects automatically
      });

      clearTimeout(timeoutId);

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
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 text-green-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <input
              type="email"
              id="email"
              name="email"
              required
              placeholder="Email"
              className="input-field-with-icons"
            />
          </div>

          {/* Password Field */}
          <div className="input-wrapper">
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 text-green-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <input
              type={showPassword ? "text" : "password"}
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

          {/* Forgot Password Link */}
          <div className="text-center mt-4">
            <a 
              href="/forgot-password" 
              className="text-sm text-green-400 hover:text-green-300 transition-colors"
            >
              Forgot Password?
            </a>
          </div>
        </form>

      </div>
    </div>
  );
}
