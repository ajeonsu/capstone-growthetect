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

  useEffect(() => {
    // Fetch user data
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

    // Set active nav based on hash
    const hash = window.location.hash;
    if (hash === '#approvals') {
      setActiveNav('approvals');
    } else if (hash === '#approved') {
      setActiveNav('approved');
    } else {
      setActiveNav('overview');
    }

    const handleHashChange = () => {
      const newHash = window.location.hash;
      if (newHash === '#approvals') {
        setActiveNav('approvals');
      } else if (newHash === '#approved') {
        setActiveNav('approved');
      } else {
        setActiveNav('overview');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (confirm('Are you sure you want to logout?')) {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    }
  };

  return (
    <>
      {/* Mobile Navbar */}
      <header className="md:hidden bg-gray-900 text-white flex justify-between items-center px-4 py-3">
        <h1 className="text-lg font-bold tracking-wide">GROWTHetect</h1>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="focus:outline-none"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      {/* Sidebar */}
      <aside
        id="sidebar"
        className={`fixed left-0 top-0 h-full w-64 bg-gray-900 text-white shadow-lg transform transition-transform duration-300 ease-in-out flex flex-col z-50 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-2xl font-extrabold text-green-400 tracking-wide">GROWTHetect</h1>
        </div>
        <div className="px-6 py-3 border-b border-gray-700">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Administrator Dashboard</h2>
        </div>
        <nav className="flex-1 mt-4 px-4 space-y-2">
          <a
            href="/admin-dashboard"
            id="nav-overview"
            className={`nav-link flex items-center px-4 py-2 rounded-lg transition ${
              activeNav === 'overview' ? 'bg-gray-800' : 'hover:bg-gray-800'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Overview
          </a>
          <a
            href="/admin-dashboard#approvals"
            id="nav-approvals"
            className={`nav-link flex items-center px-4 py-2 rounded-lg transition ${
              activeNav === 'approvals' ? 'bg-gray-800' : 'hover:bg-gray-800'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="flex-1">Approvals</span>
            {pendingReportsCount > 0 && (
              <span id="approvals-badge" className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[20px] text-center">
                {pendingReportsCount}
              </span>
            )}
            {pendingReportsCount === 0 && (
              <span id="approvals-badge" className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[20px] text-center hidden"></span>
            )}
          </a>
          <a
            href="/admin-dashboard#approved"
            id="nav-approved"
            className={`nav-link flex items-center px-4 py-2 rounded-lg transition ${
              activeNav === 'approved' ? 'bg-gray-800' : 'hover:bg-gray-800'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            Approved Reports
          </a>
        </nav>
        <div className="border-t border-gray-700 p-4 space-y-2">
          <a
            href="/admin-profile"
            className={`flex items-center px-4 py-3 rounded-lg transition ${
              pathname === '/admin-profile' ? 'bg-gray-800' : 'hover:bg-gray-800'
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-sm mr-3">
              {user?.initials || 'AD'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-100 truncate">{user?.name || 'Administrator'}</p>
              <p className="text-xs text-gray-400">Administrator</p>
            </div>
          </a>
          <a
            href="#"
            onClick={handleLogout}
            style={{ backgroundColor: 'rgba(127, 29, 29, 0.1)' }}
            className="flex items-center px-4 py-3 rounded-lg text-red-400 transition-all duration-200 group logout-btn"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="font-medium">Logout</span>
          </a>
          <style jsx>{`
            .logout-btn:hover {
              background-color: #dc2626 !important;
              color: white !important;
            }
            .logout-btn:hover svg {
              transform: scale(1.1);
            }
          `}</style>
        </div>
      </aside>
    </>
  );
}
