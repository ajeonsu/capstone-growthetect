'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useDarkMode } from '@/hooks/useDarkMode';
import ShinyText from '@/components/ShinyText';

interface NutritionistSidebarProps {
  approvedReportsCount?: number;
}

export default function NutritionistSidebar({ approvedReportsCount = 0 }: NutritionistSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; initials: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isDark, toggle: toggleDark } = useDarkMode();

  const fetchUserData = () => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.user) {
          const name = data.user.name || 'User';
          const nameParts = name.split(' ');
          const initials = nameParts.length >= 2
            ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
            : name.substring(0, 2).toUpperCase();
          setUser({ name, initials });
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchUserData();
    const handleProfileUpdate = () => fetchUserData();
    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
  }, []);

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const navLink = (path: string) => {
    const isActive = pathname === path;
    return `flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
      isActive
        ? 'bg-white/10 text-white border-l-2 border-green-400 pl-[10px]'
        : 'text-blue-100 hover:bg-white/10 hover:text-white'
    }`;
  };

  const NAV_ITEMS = [
    {
      href: '/nutritionist-overview',
      label: 'Overview',
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7m-9 2v8m-4 0h8" />
      ),
    },
    {
      href: '/student-registration',
      label: 'Student Registration',
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      ),
    },
    {
      href: '/bmi-tracking',
      label: 'BMI Tracking',
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      ),
    },
    {
      href: '/feeding-program',
      label: 'Feeding Program',
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      ),
    },
    {
      href: '/reports',
      label: 'Reports',
      badge: approvedReportsCount,
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      ),
    },
  ];

  return (
    <>
      {/* Mobile header */}
      <header className="md:hidden flex justify-between items-center px-4 py-3" style={{ background: '#1a3a6c' }}>
        <h1 className="text-lg font-extrabold tracking-wide">
          <ShinyText text="GROWTH" color="#86efac" shineColor="#ffffff" speed={3} /><span className="text-white">etect</span>
        </h1>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-white focus:outline-none">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full w-60 flex flex-col z-50 shadow-xl transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
        style={{ background: '#1a3a6c' }}
      >
        {/* Logo */}
        <div className="px-5 pt-6 pb-4 text-center border-b" style={{ borderColor: '#4a6fa5' }}>
          <h1 className="text-2xl font-extrabold tracking-normal leading-none">
            <ShinyText text="GROWTH" color="#86efac" shineColor="#ffffff" speed={3} /><span className="text-white">etect</span>
          </h1>
          <p className="text-xs mt-1" style={{ color: '#93b4d8' }}>Student Growth Monitoring</p>
        </div>

        {/* Role label */}
        <div className="px-5 py-3 text-center" style={{ borderBottom: '1px solid #4a6fa5' }}>
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#7ba7cc' }}>
            Nutritionist Dashboard
          </span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <a key={item.href} href={item.href} className={navLink(item.href)}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-2.5 flex-shrink-0 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {item.icon}
              </svg>
              <span className="flex-1">{item.label}</span>
              {item.badge != null && item.badge > 0 && (
                <span className="ml-auto bg-green-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {item.badge}
                </span>
              )}
            </a>
          ))}
        </nav>

        {/* Dark Mode Toggle */}
        <div className="px-4 py-2.5 flex items-center justify-between" style={{ borderTop: '1px solid #243f7a' }}>
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
            <span className="text-xs font-medium" style={{ color: '#93b4d8' }}>Dark Mode</span>
          </div>
          <button
            onClick={toggleDark}
            className="relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none"
            style={{ background: isDark ? '#16a34a' : 'rgba(255,255,255,0.2)' }}
            aria-label="Toggle dark mode"
          >
            <span
              className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
              style={{ transform: isDark ? 'translateX(20px)' : 'translateX(0)' }}
            />
          </button>
        </div>

        {/* Profile + Logout */}
        <div className="px-3 py-3 space-y-1" style={{ borderTop: '1px solid #243f7a' }}>
          <a
            href="/nutritionist-profile"
            className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-150 ${
              pathname === '/nutritionist-profile' ? 'bg-white/10' : 'hover:bg-white/10'
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-xs mr-2.5 flex-shrink-0">
              {user?.initials || 'NI'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name || 'Nutritionist'}</p>
              <p className="text-xs" style={{ color: '#7ba7cc' }}>Nutritionist</p>
            </div>
          </a>

          <button
            onClick={handleLogout}
            className="w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium text-red-300 hover:bg-red-600 hover:text-white transition-all duration-150 group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-2.5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </aside>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-80 mx-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900 mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center mb-2">Confirm Logout</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">Are you sure you want to logout?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
