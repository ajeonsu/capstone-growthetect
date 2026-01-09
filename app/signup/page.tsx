'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirm_password') as string;

    // Client-side validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        credentials: 'include', // Include cookies for authentication
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        // Redirect to login after 2 seconds
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        setError(data.message || 'Account creation failed');
        setLoading(false);
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="gradient-bg min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="signup-card w-full max-w-2xl relative z-10 mx-auto">
        {/* Title Section */}
        <div className="text-center mb-6">
          <h1 className="font-extrabold text-white mb-2" style={{ fontSize: '34px', lineHeight: '1.1' }}>
            <span className="text-green-400">GROWTH</span>etect
          </h1>
          <p className="text-sm text-gray-300 opacity-80">Create Your Account</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Name Fields Row */}
          <div className="name-row grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="input-wrapper relative">
              <input
                type="text"
                id="first_name"
                name="first_name"
                required
                placeholder="First Name"
                className="input-field bg-transparent border-none border-b-2 border-green-500/50 text-white transition-all w-full px-0 py-3 focus:border-green-400 focus:outline-none placeholder:text-white/50"
              />
              <div className="absolute right-0 top-1/2 transform -translate-y-1/2 text-green-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>

            <div className="input-wrapper relative">
              <input
                type="text"
                id="middle_name"
                name="middle_name"
                placeholder="Middle Name (Optional)"
                className="input-field bg-transparent border-none border-b-2 border-green-500/50 text-white transition-all w-full px-0 py-3 focus:border-green-400 focus:outline-none placeholder:text-white/50"
              />
              <div className="absolute right-0 top-1/2 transform -translate-y-1/2 text-green-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>

            <div className="input-wrapper relative">
              <input
                type="text"
                id="last_name"
                name="last_name"
                required
                placeholder="Last Name"
                className="input-field bg-transparent border-none border-b-2 border-green-500/50 text-white transition-all w-full px-0 py-3 focus:border-green-400 focus:outline-none placeholder:text-white/50"
              />
              <div className="absolute right-0 top-1/2 transform -translate-y-1/2 text-green-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Email Field */}
          <div className="input-wrapper relative mb-6">
            <input
              type="email"
              id="email"
              name="email"
              required
              placeholder="Email"
              className="input-field bg-transparent border-none border-b-2 border-green-500/50 text-white transition-all w-full px-0 py-3 focus:border-green-400 focus:outline-none placeholder:text-white/50"
            />
            <div className="absolute right-0 top-1/2 transform -translate-y-1/2 text-green-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>

          {/* Password Field */}
          <div className="input-wrapper relative mb-6">
            <input
              type="password"
              id="password"
              name="password"
              required
              placeholder="Password"
              minLength={6}
              className="input-field bg-transparent border-none border-b-2 border-green-500/50 text-white transition-all w-full px-0 py-3 focus:border-green-400 focus:outline-none placeholder:text-white/50"
            />
            <div className="absolute right-0 top-1/2 transform -translate-y-1/2 text-green-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>

          {/* Confirm Password Field */}
          <div className="input-wrapper relative mb-6">
            <input
              type="password"
              id="confirm_password"
              name="confirm_password"
              required
              placeholder="Confirm Password"
              minLength={6}
              className="input-field bg-transparent border-none border-b-2 border-green-500/50 text-white transition-all w-full px-0 py-3 focus:border-green-400 focus:outline-none placeholder:text-white/50"
            />
            <div className="absolute right-0 top-1/2 transform -translate-y-1/2 text-green-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>

          {/* Role Selection */}
          <div className="input-wrapper relative mb-6">
            <select
              id="role"
              name="role"
              required
              className="select-field bg-transparent border-none border-b-2 border-green-500/50 text-white transition-all w-full px-0 py-3 pr-8 focus:border-green-400 focus:outline-none appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'rgba(74, 222, 128, 0.7)\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E')] bg-no-repeat bg-right bg-[length:1.5em_1.5em]"
            >
              <option value="" disabled selected className="bg-gray-800 text-white">Select Role</option>
              <option value="nutritionist" className="bg-gray-800 text-white">Nutritionist</option>
              <option value="administrator" className="bg-gray-800 text-white">Administrator</option>
            </select>
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-sm px-4 py-3 rounded-lg mb-4 text-red-500 bg-transparent border-none">
              {error}
            </div>
          )}

          {/* Signup Button */}
          <button
            type="submit"
            disabled={loading}
            className="btn-signup w-full font-semibold py-4 rounded-md text-lg bg-green-500 text-white transition-all hover:bg-purple-500/50 hover:-translate-y-0.5"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        {/* Back to Login Section */}
        <div className="mt-6 text-center">
          <p className="text-gray-300 text-sm mb-2">Already have an account?</p>
          <a href="/login" className="inline-block px-8 py-2 border border-gray-400 rounded-full text-white transition hover:border-white hover:bg-white hover:bg-opacity-10">
            Back to Login
          </a>
        </div>
      </div>

      <style jsx>{`
        .gradient-bg {
          background: linear-gradient(180deg, #111827 0%, #38495fff 50%, #374151 100%);
        }
        .signup-card {
          background: transparent;
          backdrop-filter: none;
          border: none;
        }
        .input-field:-webkit-autofill,
        .input-field:-webkit-autofill:hover,
        .input-field:-webkit-autofill:focus,
        .input-field:-webkit-autofill:active {
          -webkit-background-clip: text;
          -webkit-text-fill-color: #f9fafb;
          transition: background-color 5000s ease-in-out 0s;
          box-shadow: inset 0 0 20px 20px transparent;
          background-color: transparent !important;
        }
      `}</style>
    </div>
  );
}
