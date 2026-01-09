'use client';

import { useEffect, useState } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import { useRouter } from 'next/navigation';

interface DashboardData {
  total_students: number;
  bmi_distribution: {
    'Severely Wasted': number;
    'Wasted': number;
    'Normal': number;
    'Overweight': number;
    'Obese': number;
  };
  pending_reports: number;
  pending_reports_list: any[];
  approved_reports_list: any[];
}

type ViewMode = 'overview' | 'approvals' | 'approved';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [currentApprovalsPage, setCurrentApprovalsPage] = useState(1);
  const [currentApprovedPage, setCurrentApprovedPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadDashboardData();
    
    // Handle hash navigation
    const handleHashChange = () => {
      const hash = window.location.hash.substring(1);
      if (hash === 'approvals') {
        setViewMode('approvals');
      } else if (hash === 'approved') {
        setViewMode('approved');
      } else {
        setViewMode('overview');
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const loadDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard?type=administrator');
      const data = await response.json();

      if (data.success) {
        setDashboardData(data);
        // Set initial view mode based on hash
        const hash = window.location.hash.substring(1);
        if (hash === 'approvals') {
          setViewMode('approvals');
        } else if (hash === 'approved') {
          setViewMode('approved');
        } else {
          setViewMode('overview');
        }
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setLoading(false);
    }
  };

  const approveReport = async (id: number) => {
    if (!confirm('Are you sure you want to approve this report?')) return;

    try {
      const formData = new FormData();
      formData.append('action', 'approve');
      formData.append('report_id', id.toString());

      const response = await fetch('/api/reports', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        alert('Report approved successfully');
        loadDashboardData();
      } else {
        alert('Error: ' + (data.message || 'Failed to approve report'));
      }
    } catch (error) {
      console.error('Error approving report:', error);
      alert('An error occurred while approving the report');
    }
  };

  const normalizePdfPath = (pdfFile: string | null) => {
    if (!pdfFile) return '';
    let cleanPath = pdfFile.replace(/^\/+/, '');
    if (cleanPath.startsWith('1/capstone/')) {
      return '/' + cleanPath;
    }
    if (cleanPath.startsWith('capstone/')) {
      return '/1/' + cleanPath;
    }
    if (cleanPath.startsWith('uploads/reports/')) {
      return '/1/capstone/' + cleanPath;
    }
    return '/1/capstone/' + cleanPath;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex justify-center items-center min-h-screen text-red-500">
        <p>Error loading dashboard data</p>
      </div>
    );
  }

  const dist = dashboardData.bmi_distribution || {};
  const underweight = (dist['Severely Wasted'] || 0) + (dist['Wasted'] || 0);
  const normal = dist['Normal'] || 0;
  const overweight = (dist['Overweight'] || 0) + (dist['Obese'] || 0);
  const total = dashboardData.total_students || 0;

  const pendingReports = dashboardData.pending_reports_list || [];
  const approvedReports = dashboardData.approved_reports_list || [];

  const paginatedPending = pendingReports.slice(
    (currentApprovalsPage - 1) * itemsPerPage,
    currentApprovalsPage * itemsPerPage
  );
  const paginatedApproved = approvedReports.slice(
    (currentApprovedPage - 1) * itemsPerPage,
    currentApprovedPage * itemsPerPage
  );

  const totalPendingPages = Math.ceil(pendingReports.length / itemsPerPage);
  const totalApprovedPages = Math.ceil(approvedReports.length / itemsPerPage);

  return (
    <div className="bg-gray-100 min-h-screen">
      <AdminSidebar />
      <main className="md:ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-800 mb-8">Dashboard</h1>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-xs font-medium uppercase">Total Students</p>
                  <p className="text-3xl font-bold text-blue-600 mt-2">{total}</p>
                </div>
                <div className="bg-blue-100 rounded-full p-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-xs font-medium uppercase">At Risk</p>
                  <p className="text-3xl font-bold text-red-600 mt-2">{underweight}</p>
                </div>
                <div className="bg-red-100 rounded-full p-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-xs font-medium uppercase">Normal Weight</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">{normal}</p>
                </div>
                <div className="bg-green-100 rounded-full p-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-xs font-medium uppercase">Overweight/Obese</p>
                  <p className="text-3xl font-bold text-orange-600 mt-2">{overweight}</p>
                </div>
                <div className="bg-orange-100 rounded-full p-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="bg-white rounded-lg shadow-md p-6">
            {viewMode === 'overview' && (
              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-4">BMI Status Distribution</h2>
                <div className="space-y-3">
                  {Object.keys(dist).length > 0 ? (
                    Object.entries(dist).map(([status, count]) => {
                      let colorClass = 'bg-gray-50';
                      if (status === 'Severely Wasted') colorClass = 'bg-red-50';
                      else if (status === 'Wasted') colorClass = 'bg-orange-50';
                      else if (status === 'Normal') colorClass = 'bg-green-50';
                      else if (status === 'Overweight') colorClass = 'bg-yellow-50';
                      else if (status === 'Obese') colorClass = 'bg-purple-50';

                      return (
                        <div key={status} className={`flex items-center justify-between p-4 ${colorClass} rounded-lg`}>
                          <span className="text-gray-700 font-medium">{status}</span>
                          <span className="text-2xl font-bold text-gray-900">{count}</span>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-gray-500 text-center py-4">No BMI data available</p>
                  )}
                </div>
              </div>
            )}

            {viewMode === 'approvals' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Reports Approval</h2>
                {pendingReports.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-500 text-lg">No pending reports</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead className="bg-green-600 text-white">
                          <tr>
                            <th className="px-6 py-4 text-left text-sm font-bold">Document Title</th>
                            <th className="px-6 py-4 text-left text-sm font-bold">Date of Request</th>
                            <th className="px-6 py-4 text-center text-sm font-bold">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {paginatedPending.map((report) => (
                            <tr key={report.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4">
                                <div className="text-sm font-semibold text-gray-900">{report.title}</div>
                                {report.pdf_file && (
                                  <div className="flex gap-3 mt-2">
                                    <a
                                      href={normalizePdfPath(report.pdf_file)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                      </svg>
                                      View
                                    </a>
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900">
                                {new Date(report.generated_at).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                })}
                              </td>
                              <td className="px-6 py-4 text-center">
                                <button
                                  onClick={() => approveReport(report.id)}
                                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 text-sm font-medium transition"
                                >
                                  Approve
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                      <div className="text-sm text-gray-700">
                        Showing <span>{(currentApprovalsPage - 1) * itemsPerPage + 1}</span> to{' '}
                        <span>{Math.min(currentApprovalsPage * itemsPerPage, pendingReports.length)}</span> of{' '}
                        <span>{pendingReports.length}</span> reports
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setCurrentApprovalsPage((p) => Math.max(1, p - 1))}
                          disabled={currentApprovalsPage === 1}
                          className={`px-4 py-2 rounded ${
                            currentApprovalsPage === 1
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                        >
                          Previous
                        </button>
                        {Array.from({ length: totalPendingPages }, (_, i) => i + 1)
                          .filter((i) => i === 1 || i === totalPendingPages || (i >= currentApprovalsPage - 1 && i <= currentApprovalsPage + 1))
                          .map((i, idx, arr) => (
                            <div key={i} className="flex items-center gap-1">
                              {idx > 0 && arr[idx - 1] !== i - 1 && <span className="px-2">...</span>}
                              <button
                                onClick={() => setCurrentApprovalsPage(i)}
                                className={`px-4 py-2 rounded ${
                                  i === currentApprovalsPage
                                    ? 'bg-green-600 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                              >
                                {i}
                              </button>
                            </div>
                          ))}
                        <button
                          onClick={() => setCurrentApprovalsPage((p) => Math.min(totalPendingPages, p + 1))}
                          disabled={currentApprovalsPage === totalPendingPages}
                          className={`px-4 py-2 rounded ${
                            currentApprovalsPage === totalPendingPages
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {viewMode === 'approved' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Approved Reports</h2>
                {approvedReports.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-500 text-lg">No approved reports</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead className="bg-green-600 text-white">
                          <tr>
                            <th className="px-6 py-4 text-left text-sm font-bold">Document Title</th>
                            <th className="px-6 py-4 text-left text-sm font-bold">Date Approved</th>
                            <th className="px-6 py-4 text-center text-sm font-bold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {paginatedApproved.map((report) => (
                            <tr key={report.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4">
                                <div className="text-sm font-semibold text-gray-900">{report.title}</div>
                                {report.pdf_file && (
                                  <div className="flex gap-3 mt-2">
                                    <a
                                      href={normalizePdfPath(report.pdf_file)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                      </svg>
                                      View
                                    </a>
                                    <a
                                      href={`/api/reports/download?file=${report.pdf_file?.split('/').pop()}`}
                                      className="text-sm text-green-600 hover:text-green-800 inline-flex items-center gap-1"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                      </svg>
                                      Download
                                    </a>
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900">
                                {report.reviewed_at
                                  ? new Date(report.reviewed_at).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric',
                                    })
                                  : 'N/A'}
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="inline-flex px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-800">
                                  Approved
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                      <div className="text-sm text-gray-700">
                        Showing <span>{(currentApprovedPage - 1) * itemsPerPage + 1}</span> to{' '}
                        <span>{Math.min(currentApprovedPage * itemsPerPage, approvedReports.length)}</span> of{' '}
                        <span>{approvedReports.length}</span> reports
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setCurrentApprovedPage((p) => Math.max(1, p - 1))}
                          disabled={currentApprovedPage === 1}
                          className={`px-4 py-2 rounded ${
                            currentApprovedPage === 1
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                        >
                          Previous
                        </button>
                        {Array.from({ length: totalApprovedPages }, (_, i) => i + 1)
                          .filter((i) => i === 1 || i === totalApprovedPages || (i >= currentApprovedPage - 1 && i <= currentApprovedPage + 1))
                          .map((i, idx, arr) => (
                            <div key={i} className="flex items-center gap-1">
                              {idx > 0 && arr[idx - 1] !== i - 1 && <span className="px-2">...</span>}
                              <button
                                onClick={() => setCurrentApprovedPage(i)}
                                className={`px-4 py-2 rounded ${
                                  i === currentApprovedPage
                                    ? 'bg-green-600 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                              >
                                {i}
                              </button>
                            </div>
                          ))}
                        <button
                          onClick={() => setCurrentApprovedPage((p) => Math.min(totalApprovedPages, p + 1))}
                          disabled={currentApprovedPage === totalApprovedPages}
                          className={`px-4 py-2 rounded ${
                            currentApprovedPage === totalApprovedPages
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
