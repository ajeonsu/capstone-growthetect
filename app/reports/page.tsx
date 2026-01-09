'use client';

import { useEffect, useState } from 'react';
import NutritionistSidebar from '@/components/NutritionistSidebar';

interface Report {
  id: number;
  title: string;
  report_type: string;
  description: string;
  status: string;
  pdf_file?: string;
  generated_at: string;
  reviewed_at?: string;
  review_notes?: string;
  data?: any;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [formError, setFormError] = useState('');
  const itemsPerPage = 10;

  useEffect(() => {
    loadReports();
  }, [statusFilter, typeFilter]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('type', typeFilter);

      const response = await fetch(`/api/reports?${params}`, {
        credentials: 'include', // Include cookies for authentication
      });
      
      const data = await response.json();

      if (data.success) {
        setReports(data.reports || []);
        setCurrentPage(1);
        if (data.reports && data.reports.length === 0) {
          console.log('[REPORTS] No reports found');
        }
      } else {
        console.error('[REPORTS] API error:', data.message);
        setFormError(data.message || 'Error loading reports');
        setReports([]);
      }
      setLoading(false);
    } catch (error: any) {
      console.error('[REPORTS] Error loading reports:', error);
      setFormError('Error loading reports. Please try again.');
      setReports([]);
      setLoading(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const formData = new FormData(e.target as HTMLFormElement);
    formData.append('action', 'generate');

    const reportType = formData.get('report_type') as string;
    const reportMonth = formData.get('report_month') as string;

    if (reportType === 'monthly_bmi' && !reportMonth) {
      setFormError('Please select a month for monthly BMI reports');
      return;
    }

    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        credentials: 'include', // Include cookies for authentication
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        alert('Report generated successfully!');
        setShowGenerateModal(false);
        loadReports();
      } else {
        setFormError(data.message);
      }
    } catch (error) {
      setFormError('An error occurred. Please try again.');
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport) return;
    setFormError('');

    const formData = new FormData(e.target as HTMLFormElement);
    const reportType = formData.get('report_type') as string;
    const reportMonth = formData.get('report_month') as string;

    if (reportType === 'monthly_bmi' && !reportMonth) {
      setFormError('Please select a month for monthly BMI reports');
      return;
    }

    try {
      const response = await fetch('/api/reports', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedReport.id,
          title: formData.get('title'),
          report_type: reportType,
          description: formData.get('description'),
          report_month: reportMonth,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('Report updated successfully!');
        setShowEditModal(false);
        setSelectedReport(null);
        loadReports();
      } else {
        setFormError(data.message);
      }
    } catch (error) {
      setFormError('An error occurred. Please try again.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this report?')) return;

    try {
      const response = await fetch(`/api/reports?id=${id}`, {
        method: 'DELETE',
        credentials: 'include', // Include cookies for authentication
      });

      const data = await response.json();

      if (data.success) {
        alert('Report deleted successfully!');
        loadReports();
      } else {
        alert(data.message);
      }
    } catch (error) {
      alert('Error deleting report');
    }
  };

  const viewReport = async (id: number) => {
    try {
      const response = await fetch(`/api/reports?id=${id}`, {
        credentials: 'include', // Include cookies for authentication
      });
      const data = await response.json();

      if (data.success) {
        setSelectedReport(data.report);
        setShowViewModal(true);
      }
    } catch (error) {
      console.error('Error loading report:', error);
    }
  };

  const formatReportType = (type: string) => {
    const types: Record<string, string> = {
      monthly_bmi: 'Monthly BMI',
      pre_post: 'Pre and Post',
      feeding_program: 'Feeding Program',
    };
    return types[type] || type.replace('_', ' ');
  };

  const getStatusClass = (status: string) => {
    const classes: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  };

  const normalizePdfPath = (pdfFile: string | null | undefined) => {
    if (!pdfFile) return '';
    let cleanPath = pdfFile.replace(/^\/+/, '');
    if (cleanPath.startsWith('1/capstone/')) return '/' + cleanPath;
    if (cleanPath.startsWith('capstone/')) return '/1/' + cleanPath;
    if (cleanPath.startsWith('uploads/reports/')) return '/1/capstone/' + cleanPath;
    return '/1/capstone/' + cleanPath;
  };

  const paginatedReports = reports.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(reports.length / itemsPerPage);
  const startRecord = reports.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endRecord = Math.min(currentPage * itemsPerPage, reports.length);

  return (
    <div className="bg-gray-50 min-h-screen">
      <NutritionistSidebar />

      <div className="md:ml-64 p-6 transition-all duration-300">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Report Management</h2>
            <button
              onClick={() => setShowGenerateModal(true)}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
            >
              Generate Report
            </button>
          </div>
        </div>

        {/* Reports List */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">My Reports</h2>

          {/* Filters */}
          <div className="flex gap-2 mb-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="">All Types</option>
              <option value="monthly_bmi">Monthly BMI</option>
              <option value="pre_post">Pre and Post</option>
              <option value="feeding_program">Feeding Program</option>
            </select>
          </div>

          <div>
            {loading ? (
              <p className="text-center text-gray-500">Loading...</p>
            ) : paginatedReports.length === 0 ? (
              <p className="text-center text-gray-500">No reports found</p>
            ) : (
              paginatedReports.map((report) => (
                <div key={report.id} className="bg-gray-50 hover:bg-gray-100 transition rounded-lg p-3 mb-2 border border-gray-200">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 text-base truncate">{report.title}</h4>
                        <div className="flex items-center gap-3 mt-1">
                          <p className="text-xs text-gray-600 capitalize">{formatReportType(report.report_type)}</p>
                          <span className="text-xs text-gray-400">{new Date(report.generated_at).toLocaleString()}</span>
                        </div>
                        {report.review_notes && (
                          <p className="text-xs text-gray-600 mt-1 bg-yellow-50 px-2 py-1 rounded">
                            <strong>Notes:</strong> {report.review_notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusClass(report.status)}`}>
                        {report.status.toUpperCase()}
                      </span>
                      <div className="flex gap-1">
                        {report.pdf_file ? (
                          <>
                            <a
                              href={normalizePdfPath(report.pdf_file)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-4 py-2 bg-white hover:bg-green-50 text-green-600 border-2 border-green-600 text-sm font-semibold rounded-lg shadow-md transition"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View
                            </a>
                            {report.status === 'approved' && (
                              <a
                                href={`/api/reports/download?file=${report.pdf_file.split('/').pop()}`}
                                className="inline-flex items-center gap-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg shadow-md transition"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Download
                              </a>
                            )}
                          </>
                        ) : (
                          <a
                            href={`/api/reports/view?id=${report.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-4 py-2 bg-white hover:bg-green-50 text-green-600 border-2 border-green-600 text-sm font-semibold rounded-lg shadow-md transition"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View
                          </a>
                        )}
                        {report.status !== 'approved' && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedReport(report);
                                setShowEditModal(true);
                              }}
                              className="inline-flex items-center gap-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white border-2 border-blue-700 text-sm font-semibold rounded-lg shadow-md transition"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(report.id)}
                              className="inline-flex items-center gap-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white border-2 border-red-700 text-sm font-semibold rounded-lg shadow-md transition"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {reports.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing <span>{startRecord}</span> to <span>{endRecord}</span> of <span>{reports.length}</span> reports
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded ${
                    currentPage === 1
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((i) => i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1))
                  .map((i, idx, arr) => (
                    <div key={i} className="flex items-center gap-1">
                      {idx > 0 && arr[idx - 1] !== i - 1 && <span className="px-2">...</span>}
                      <button
                        onClick={() => setCurrentPage(i)}
                        className={`px-4 py-2 rounded ${
                          i === currentPage
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {i}
                      </button>
                    </div>
                  ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2 rounded ${
                    currentPage === totalPages
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Generate Report Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Generate Report</h3>
              <button onClick={() => setShowGenerateModal(false)} className="text-gray-500 hover:text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleGenerate} className="space-y-3">
              <div>
                <label className="block text-gray-700 text-sm mb-1">Report Title *</label>
                <input
                  type="text"
                  name="title"
                  required
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm mb-1">Report Type *</label>
                <select
                  name="report_type"
                  required
                  onChange={(e) => {
                    const monthContainer = document.getElementById('monthFilterContainer');
                    if (monthContainer) {
                      monthContainer.style.display = e.target.value === 'monthly_bmi' ? 'block' : 'none';
                    }
                  }}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
                >
                  <option value="">Select report type...</option>
                  <option value="monthly_bmi">Monthly BMI Report</option>
                  <option value="pre_post">Pre and Post Report</option>
                  <option value="feeding_program">Feeding Program</option>
                </select>
              </div>

              <div id="monthFilterContainer" style={{ display: 'none' }}>
                <label className="block text-gray-700 text-sm mb-1">Select Month *</label>
                <input
                  type="month"
                  name="report_month"
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm mb-1">Description</label>
                <textarea
                  name="description"
                  rows={3}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>

              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {formError}
                </div>
              )}

              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-medium">
                  Submit Report
                </button>
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Report Modal */}
      {showEditModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Edit Report</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedReport(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleEdit} className="space-y-3">
              <div>
                <label className="block text-gray-700 text-sm mb-1">Report Title *</label>
                <input
                  type="text"
                  name="title"
                  required
                  defaultValue={selectedReport.title}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm mb-1">Report Type *</label>
                <select
                  name="report_type"
                  required
                  defaultValue={selectedReport.report_type}
                  onChange={(e) => {
                    const monthContainer = document.getElementById('editMonthFilterContainer');
                    if (monthContainer) {
                      monthContainer.style.display = e.target.value === 'monthly_bmi' ? 'block' : 'none';
                    }
                  }}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
                >
                  <option value="">Select report type...</option>
                  <option value="monthly_bmi">Monthly BMI Report</option>
                  <option value="pre_post">Pre and Post Report</option>
                  <option value="feeding_program">Feeding Program</option>
                </select>
              </div>

              <div
                id="editMonthFilterContainer"
                style={{ display: selectedReport.report_type === 'monthly_bmi' ? 'block' : 'none' }}
              >
                <label className="block text-gray-700 text-sm mb-1">Select Month *</label>
                <input
                  type="month"
                  name="report_month"
                  defaultValue={selectedReport.data?.report_month || ''}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm mb-1">Description</label>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={selectedReport.description}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>

              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {formError}
                </div>
              )}

              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-medium">
                  Update Report
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedReport(null);
                  }}
                  className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Report Modal */}
      {showViewModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">View Report</h3>
              <button onClick={() => setShowViewModal(false)} className="text-gray-500 hover:text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-gray-700 text-sm font-semibold mb-1">Report Title</label>
                <p className="text-sm text-gray-800 bg-gray-50 p-3 rounded">{selectedReport.title}</p>
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-semibold mb-1">Report Type</label>
                <p className="text-sm text-gray-800 bg-gray-50 p-3 rounded">{formatReportType(selectedReport.report_type)}</p>
              </div>

              {selectedReport.data?.report_month && (
                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-1">Report Month</label>
                  <p className="text-sm text-gray-800 bg-gray-50 p-3 rounded">{selectedReport.data.report_month}</p>
                </div>
              )}

              <div>
                <label className="block text-gray-700 text-sm font-semibold mb-1">Description</label>
                <p className="text-sm text-gray-800 bg-gray-50 p-3 rounded min-h-[60px]">{selectedReport.description}</p>
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-semibold mb-1">Status</label>
                <p className="text-sm">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusClass(selectedReport.status)}`}>
                    {selectedReport.status.toUpperCase()}
                  </span>
                </p>
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-semibold mb-1">Generated At</label>
                <p className="text-sm text-gray-600">{new Date(selectedReport.generated_at).toLocaleString()}</p>
              </div>

              {selectedReport.pdf_file && (
                <div className="flex gap-2">
                  <a
                    href={normalizePdfPath(selectedReport.pdf_file)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium text-center"
                  >
                    👁️ View Report
                  </a>
                  {selectedReport.status === 'approved' && (
                    <a
                      href={`/api/reports/download?file=${selectedReport.pdf_file.split('/').pop()}`}
                      className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-medium text-center"
                    >
                      ⬇️ Download
                    </a>
                  )}
                </div>
              )}

              <button
                onClick={() => setShowViewModal(false)}
                className="w-full bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
