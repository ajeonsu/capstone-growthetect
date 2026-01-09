'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function NutritionistSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; initials: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Fetch user data
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
  }, []);

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (confirm('Are you sure you want to logout?')) {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    }
  };

  const isActive = (path: string) => pathname === path;

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
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Nutritionist Dashboard</h2>
        </div>
        <nav className="flex-1 mt-4 px-4 space-y-2">
          <a
            href="/nutritionist-overview"
            className={`flex items-center px-4 py-2 rounded-lg transition ${
              isActive('/nutritionist-overview') ? 'bg-gray-800' : 'hover:bg-gray-800'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7m-9 2v8m-4 0h8" />
            </svg>
            Overview
          </a>
          <a
            href="/student-registration"
            className={`flex items-center px-4 py-2 rounded-lg transition ${
              isActive('/student-registration') ? 'bg-gray-800' : 'hover:bg-gray-800'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Student Registration
          </a>
          <a
            href="/bmi-tracking"
            className={`flex items-center px-4 py-2 rounded-lg transition ${
              isActive('/bmi-tracking') ? 'bg-gray-800' : 'hover:bg-gray-800'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            BMI Tracking
          </a>
          <a
            href="/data-logs"
            className={`flex items-center px-4 py-2 rounded-lg transition ${
              isActive('/data-logs') ? 'bg-gray-800' : 'hover:bg-gray-800'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            Data Logs
          </a>
          <a
            href="/feeding-program"
            className={`flex items-center px-4 py-2 rounded-lg transition ${
              isActive('/feeding-program') ? 'bg-gray-800' : 'hover:bg-gray-800'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Feeding Program
          </a>
          <a
            href="/reports"
            className={`flex items-center px-4 py-2 rounded-lg transition ${
              isActive('/reports') ? 'bg-gray-800' : 'hover:bg-gray-800'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Reports
          </a>
        </nav>
        <div className="border-t border-gray-700 p-4 space-y-2">
          <a
            href="/nutritionist-profile"
            className={`flex items-center px-4 py-3 rounded-lg transition ${
              isActive('/nutritionist-profile') ? 'bg-gray-800' : 'hover:bg-gray-800'
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-sm mr-3">
              {user?.initials || 'NI'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-100 truncate">{user?.name || 'Nutritionist'}</p>
              <p className="text-xs text-gray-400">Nutritionist</p>
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
