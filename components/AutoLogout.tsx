'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const INACTIVITY_TIMEOUT  = 10 * 60 * 1000;      // 10 minutes
const MAX_SESSION_TIMEOUT = 8 * 60 * 60 * 1000;  // 8 hours
const WARNING_BEFORE      = 60 * 1000;            // Warn 60 s before logout

const SESSION_START_KEY = 'grw_session_start';

// Routes where auto-logout should NOT apply (user is not authenticated)
const PUBLIC_ROUTES = ['/login', '/forgot-password', '/signup'];

type WarningReason = 'inactivity' | 'session';

export default function AutoLogout() {
  const router   = useRouter();
  const pathname = usePathname();

  const [showWarning,   setShowWarning]   = useState(false);
  const [countdown,     setCountdown]     = useState(60);
  const [warningReason, setWarningReason] = useState<WarningReason>('inactivity');

  // Use a ref so callbacks always read the latest reason without stale closures
  const warningReasonRef = useRef<WarningReason>('inactivity');

  // Inactivity timers
  const inactivityWarnRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inactivityLogoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Absolute session timers
  const sessionWarnRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionLogoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Countdown interval
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isPublicRoute = PUBLIC_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'));

  // ── helpers ────────────────────────────────────────────────────────────────

  const clearInactivityTimers = useCallback(() => {
    if (inactivityWarnRef.current)   clearTimeout(inactivityWarnRef.current);
    if (inactivityLogoutRef.current) clearTimeout(inactivityLogoutRef.current);
    inactivityWarnRef.current = inactivityLogoutRef.current = null;
  }, []);

  const clearSessionTimers = useCallback(() => {
    if (sessionWarnRef.current)   clearTimeout(sessionWarnRef.current);
    if (sessionLogoutRef.current) clearTimeout(sessionLogoutRef.current);
    sessionWarnRef.current = sessionLogoutRef.current = null;
  }, []);

  const clearCountdown = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = null;
  }, []);

  const startCountdown = useCallback((reason: WarningReason) => {
    clearCountdown();
    warningReasonRef.current = reason;
    setWarningReason(reason);
    setShowWarning(true);
    let remaining = 60;
    setCountdown(remaining);
    countdownRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
    }, 1000);
  }, [clearCountdown]);

  // ── logout ─────────────────────────────────────────────────────────────────

  const logout = useCallback(async () => {
    clearInactivityTimers();
    clearSessionTimers();
    clearCountdown();
    setShowWarning(false);
    try {
      sessionStorage.removeItem(SESSION_START_KEY);
    } catch { /* ignore */ }
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch { /* proceed anyway */ }
    // Hard navigation clears the bfcache entry for the protected page and
    // replaces the history entry so the back button cannot return to it.
    window.location.replace('/login');
  }, [clearInactivityTimers, clearSessionTimers, clearCountdown]);

  // ── inactivity timer (resets on every user action) ─────────────────────────

  const resetInactivityTimer = useCallback(() => {
    // If the absolute session warning is already showing, don't reset
    if (warningReasonRef.current === 'session' && showWarning) return;

    clearInactivityTimers();

    // Hide inactivity warning if it was showing
    if (warningReasonRef.current === 'inactivity') {
      setShowWarning(false);
      clearCountdown();
    }

    inactivityWarnRef.current = setTimeout(() => {
      // Don't show inactivity warning if session warning already showing
      if (warningReasonRef.current !== 'session') {
        startCountdown('inactivity');
      }
    }, INACTIVITY_TIMEOUT - WARNING_BEFORE);

    inactivityLogoutRef.current = setTimeout(() => {
      logout();
    }, INACTIVITY_TIMEOUT);
  }, [showWarning, clearInactivityTimers, clearCountdown, startCountdown, logout]);

  // ── absolute session timer (never resets, survives page navigation) ─────────

  const setupSessionTimer = useCallback(() => {
    clearSessionTimers();

    let sessionStart: number;
    try {
      sessionStart = parseInt(sessionStorage.getItem(SESSION_START_KEY) || '0', 10);
      if (!sessionStart) {
        sessionStart = Date.now();
        sessionStorage.setItem(SESSION_START_KEY, String(sessionStart));
      }
    } catch {
      sessionStart = Date.now();
    }

    const elapsed   = Date.now() - sessionStart;
    const remaining = MAX_SESSION_TIMEOUT - elapsed;

    if (remaining <= 0) {
      // Session already exceeded 8 hours (e.g. after a long background tab)
      logout();
      return;
    }

    const warnIn = remaining - WARNING_BEFORE;
    if (warnIn > 0) {
      sessionWarnRef.current = setTimeout(() => {
        clearInactivityTimers(); // stop inactivity timers so only session countdown runs
        startCountdown('session');
      }, warnIn);
    } else {
      // Less than 60 s left (e.g. user refreshed just before expiry)
      startCountdown('session');
    }

    sessionLogoutRef.current = setTimeout(() => {
      logout();
    }, remaining);
  }, [clearSessionTimers, clearInactivityTimers, startCountdown, logout]);

  // ── bfcache guard: fires when page is restored from browser back/forward cache ─
  // When a protected page is thawed from bfcache (back button after logout),
  // force a hard reload so the middleware re-checks the auth cookie.
  // If the cookie is gone the middleware redirects to /login with no visible flash.

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      // Only act on protected routes
      if (PUBLIC_ROUTES.some(r => window.location.pathname === r || window.location.pathname.startsWith(r + '/'))) return;
      // Hard reload → fresh server request → middleware auth check
      window.location.reload();
    };

    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  // ── mount / route-change effect ────────────────────────────────────────────

  useEffect(() => {
    if (isPublicRoute) {
      clearInactivityTimers();
      clearSessionTimers();
      clearCountdown();
      setShowWarning(false);
      return;
    }

    // Start (or re-anchor) the absolute 8-hour session timer
    setupSessionTimer();

    // Attach activity listeners for inactivity detection
    const EVENTS = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'click',
    ] as const;

    const handler = () => resetInactivityTimer();
    EVENTS.forEach(e => document.addEventListener(e, handler, { passive: true }));
    resetInactivityTimer(); // kick off the first inactivity countdown

    return () => {
      EVENTS.forEach(e => document.removeEventListener(e, handler));
      clearInactivityTimers();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // ── "Stay logged in" — only available for inactivity warnings ──────────────

  const stayLoggedIn = useCallback(() => {
    if (warningReason === 'session') return; // cannot extend the absolute session
    clearCountdown();
    setShowWarning(false);
    warningReasonRef.current = 'inactivity';
    resetInactivityTimer();
  }, [warningReason, clearCountdown, resetInactivityTimer]);

  if (!showWarning || isPublicRoute) return null;

  const isSessionExpiry = warningReason === 'session';

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="autologout-title"
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
        {/* Warning icon */}
        <div className={`flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full ${isSessionExpiry ? 'bg-red-100 dark:bg-red-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'}`}>
          <svg
            className={`w-8 h-8 ${isSessionExpiry ? 'text-red-500' : 'text-yellow-500'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>

        <h2
          id="autologout-title"
          className="text-xl font-bold text-gray-800 dark:text-white mb-2"
        >
          {isSessionExpiry ? 'Session Limit Reached' : 'Session Expiring Soon'}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-2 text-sm">
          {isSessionExpiry
            ? 'Your 8-hour session has ended. Please log in again to continue.'
            : 'You have been inactive for a while.'}
        </p>
        <p className="text-gray-800 dark:text-gray-100 font-semibold mb-6">
          You will be automatically logged out in{' '}
          <span className="text-red-500 font-bold text-lg">{countdown}s</span>
        </p>

        <div className="flex gap-3 justify-center">
          {!isSessionExpiry && (
            <button
              onClick={stayLoggedIn}
              className="flex-1 px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-semibold transition-colors"
            >
              Stay Logged In
            </button>
          )}
          <button
            onClick={logout}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              isSessionExpiry
                ? 'w-full bg-red-500 hover:bg-red-600 text-white'
                : 'flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white'
            }`}
          >
            {isSessionExpiry ? 'Log In Again' : 'Logout Now'}
          </button>
        </div>
      </div>
    </div>
  );
}
