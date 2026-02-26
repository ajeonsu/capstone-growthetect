'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

interface AdminSidebarProps {
  pendingReportsCount?: number;
}

export default function AdminSidebar({ pendingReportsCount = 0 }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; initials: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('overview');

  const fetchUserData = () => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.user) {
          const name = data.user.name || data.user.first_name + ' ' + data.user.last_name || 'Admin';
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

    const hash = window.location.hash;
    if (hash === '#approvals') setActiveNav('approvals');
    else if (hash === '#approved') setActiveNav('approved');
    else setActiveNav('overview');

    const handleHashChange = () => {
      const h = window.location.hash;
      if (h === '#approvals') setActiveNav('approvals');
      else if (h === '#approved') setActiveNav('approved');
      else setActiveNav('overview');
    };
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, []);

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (confirm('Are you sure you want to logout?')) {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    }
  };

  const navLink = (isActive: boolean) =>
    `flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
      isActive
        ? 'bg-white/10 text-white border-l-2 border-green-400 pl-[10px]'
        : 'text-blue-100 hover:bg-white/10 hover:text-white'
    }`;

  return (
    <>
      {/* Mobile header */}
      <header className="md:hidden flex justify-between items-center px-4 py-3" style={{ background: '#1a3a6c' }}>
        <h1 className="text-lg font-extrabold tracking-wide">
          <span className="text-green-400">GROWTH</span>
          <span className="text-white">etect</span>
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
        <div className="px-5 py-5 border-b" style={{ borderColor: '#243f7a' }}>
          <h1 className="text-xl font-extrabold tracking-wide leading-none">
            <span className="text-green-400">GROWTH</span>
            <span className="text-white">etect</span>
          </h1>
          <p className="text-xs mt-1" style={{ color: '#93b4d8' }}>Student Growth Monitoring</p>
        </div>

        {/* Role label */}
        <div className="px-5 py-2.5" style={{ borderBottom: '1px solid #243f7a' }}>
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#7ba7cc' }}>
            Administrator
          </span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          <a href="/admin-dashboard" className={navLink(activeNav === 'overview')}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-2.5 flex-shrink-0 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Overview
          </a>

          <a href="/admin-dashboard#approvals" className={navLink(activeNav === 'approvals')}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-2.5 flex-shrink-0 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="flex-1">Approvals</span>
            {pendingReportsCount > 0 && (
              <span className="ml-auto bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {pendingReportsCount}
              </span>
            )}
          </a>

          <a href="/admin-dashboard#approved" className={navLink(activeNav === 'approved')}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-2.5 flex-shrink-0 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            Approved Reports
          </a>

          <a href="/signup" className={navLink(pathname === '/signup')}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-2.5 flex-shrink-0 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Manage Users
          </a>
        </nav>

        {/* Profile + Logout */}
        <div className="px-3 py-3 space-y-1" style={{ borderTop: '1px solid #243f7a' }}>
          <a
            href="/admin-profile"
            className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-150 ${
              pathname === '/admin-profile' ? 'bg-white/10' : 'hover:bg-white/10'
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-xs mr-2.5 flex-shrink-0">
              {user?.initials || 'AD'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name || 'Administrator'}</p>
              <p className="text-xs" style={{ color: '#7ba7cc' }}>Administrator</p>
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
    </>
  );
}
