'use client';

import { useEffect, useState } from 'react';
import NutritionistSidebar from '@/components/NutritionistSidebar';

export default function DataLogsPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    month: '',
    year: '',
    name: '',
    gender: '',
    grade: '',
    status: '',
    hfaStatus: '',
  });
  const [showModal, setShowModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [studentHistory, setStudentHistory] = useState<any[]>([]);
  const itemsPerPage = 15;

  useEffect(() => {
    loadDataLogs();
  }, [filters]);

  const loadDataLogs = async () => {
    try {
      // Only load if both month and year are selected
      if (!filters.month || !filters.year) {
        setRecords([]);
        setLoading(false);
        return;
      }

      const params = new URLSearchParams();
      // Construct date as YYYY-MM-DD format (first day of the month)
      const date = `${filters.year}-${filters.month.padStart(2, '0')}-01`;
      params.append('date', date);
      
      if (filters.name) params.append('search', filters.name);
      if (filters.gender) params.append('gender', filters.gender);
      if (filters.grade) params.append('grade', filters.grade);
      if (filters.status) params.append('status', filters.status);
      if (filters.hfaStatus) params.append('hfa_status', filters.hfaStatus);

      const response = await fetch(`/api/bmi-records?${params}`, {
        credentials: 'include', // Include cookies for authentication
      });
      const data = await response.json();

      if (data.success) {
        setRecords(data.records);
        setCurrentPage(1);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading data logs:', error);
      setLoading(false);
    }
  };

  const viewDetails = async (studentId: number) => {
    try {
      const response = await fetch(`/api/bmi-records?student_id=${studentId}`, {
        credentials: 'include', // Include cookies for authentication
      });
      const data = await response.json();

      if (data.success && data.records.length > 0) {
        setSelectedStudent(data.records[0]);
        setStudentHistory(data.records);
        setShowModal(true);
      }
    } catch (error) {
      console.error('Error loading student details:', error);
      alert('Error loading student details');
    }
  };

  const getBMIStatusClass = (status: string) => {
    const classes: Record<string, string> = {
      'Severely Wasted': 'bg-red-100 text-red-800',
      'Wasted': 'bg-yellow-100 text-yellow-800',
      'Normal': 'bg-green-100 text-green-800',
      'Overweight': 'bg-orange-100 text-orange-800',
      'Obese': 'bg-red-100 text-red-800',
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  };

  const getHFAStatusClass = (status: string) => {
    const classes: Record<string, string> = {
      'Severely Stunted': 'bg-red-100 text-red-800',
      'Stunted': 'bg-yellow-100 text-yellow-800',
      'Normal': 'bg-green-100 text-green-800',
      'Tall': 'bg-blue-100 text-blue-800',
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  };

  const paginatedRecords = records.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(records.length / itemsPerPage);
  const startRecord = records.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endRecord = Math.min(currentPage * itemsPerPage, records.length);

  return (
    <div className="bg-slate-50 min-h-screen">
      <NutritionistSidebar />

      <main className="md:ml-64 min-h-screen bg-slate-50">
        {/* Page Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4">
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Data Logs</h1>
          <p className="text-xs text-slate-500 mt-0.5">View all BMI records and measurements</p>
        </div>

        <div className="p-5">
        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Month</label>
              <select
                value={filters.month}
                onChange={(e) => setFilters({ ...filters, month: e.target.value })}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Months</option>
                <option value="1">January</option>
                <option value="2">February</option>
                <option value="3">March</option>
                <option value="4">April</option>
                <option value="5">May</option>
                <option value="6">June</option>
                <option value="7">July</option>
                <option value="8">August</option>
                <option value="9">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Year</label>
              <select
                value={filters.year}
                onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Years</option>
                <option value="2024">2024</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
                <option value="2028">2028</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Search Name</label>
              <input
                type="text"
                value={filters.name}
                onChange={(e) => {
                  setFilters({ ...filters, name: e.target.value });
                  clearTimeout((window as any).searchTimeout);
                  (window as any).searchTimeout = setTimeout(() => setFilters({ ...filters, name: e.target.value }), 500);
                }}
                placeholder="Enter name..."
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Gender</label>
              <select
                value={filters.gender}
                onChange={(e) => setFilters({ ...filters, gender: e.target.value })}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Grade Level</label>
              <select
                value={filters.grade}
                onChange={(e) => setFilters({ ...filters, grade: e.target.value })}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Grades</option>
                <option value="0">Kinder</option>
                <option value="1">Grade 1</option>
                <option value="2">Grade 2</option>
                <option value="3">Grade 3</option>
                <option value="4">Grade 4</option>
                <option value="5">Grade 5</option>
                <option value="6">Grade 6</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">BMI Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                <option value="Severely Wasted">Severely Wasted</option>
                <option value="Wasted">Wasted</option>
                <option value="Normal">Normal</option>
                <option value="Overweight">Overweight</option>
                <option value="Obese">Obese</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">HFA Status</label>
              <select
                value={filters.hfaStatus}
                onChange={(e) => setFilters({ ...filters, hfaStatus: e.target.value })}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                <option value="Severely Stunted">Severely Stunted</option>
                <option value="Stunted">Stunted</option>
                <option value="Normal">Normal</option>
                <option value="Tall">Tall</option>
              </select>
            </div>
          </div>
          {!filters.month || !filters.year ? (
            <div className="mt-3 p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-xs">
              ℹ️ Please select both month and year to view BMI records
            </div>
          ) : null}
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#1a3a6c' }}>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-white uppercase tracking-wider">LRN No.</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-white uppercase tracking-wider">Name</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-white uppercase tracking-wider">Age</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-white uppercase tracking-wider">Gender</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-white uppercase tracking-wider">Grade</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-white uppercase tracking-wider">Weight (kg)</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-white uppercase tracking-wider">Height (cm)</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-white uppercase tracking-wider">BMI</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-white uppercase tracking-wider">BMI Status</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-white uppercase tracking-wider">HFA Status</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-white uppercase tracking-wider">Date</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-white uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-8 text-center text-slate-400 text-sm">
                      Loading...
                    </td>
                  </tr>
                ) : paginatedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-8 text-center text-slate-400 text-sm">
                      No records found
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2.5 text-slate-600">{record.lrn}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-800">
                        {record.first_name} {record.last_name}
                      </td>
                      <td className="px-4 py-2.5 text-slate-700">{record.age}</td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${record.gender === 'M' || record.gender === 'Male' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'}`}>
                          {record.gender === 'M' || record.gender === 'Male' ? 'Male' : record.gender}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-700">{record.grade_level === 0 || record.grade_level === '0' ? 'Kinder' : `Grade ${record.grade_level}`}</td>
                      <td className="px-4 py-2.5 text-slate-700">{record.weight}</td>
                      <td className="px-4 py-2.5 text-slate-700">{record.height}</td>
                      <td className="px-4 py-2.5 font-semibold text-slate-800">{record.bmi}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${getBMIStatusClass(record.bmi_status)}`}>
                          {record.bmi_status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${getHFAStatusClass(record.height_for_age_status || 'Normal')}`}>
                          {record.height_for_age_status || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">
                        {new Date(record.measured_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => viewDetails(record.student_id)}
                          className="px-3 py-1 text-xs font-medium text-white rounded-lg hover:opacity-90 transition"
                          style={{ background: '#1a3a6c' }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {records.length > 0 && (
            <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                Showing <span className="font-medium text-slate-700">{startRecord}</span> to <span className="font-medium text-slate-700">{endRecord}</span> of{' '}
                <span className="font-medium text-slate-700">{records.length}</span> records
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium ${currentPage === 1 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'text-white hover:opacity-90'}`}
                  style={currentPage !== 1 ? { background: '#1a3a6c' } : {}}
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((i) => i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1))
                  .map((i, idx, arr) => (
                    <div key={i} className="flex items-center gap-1">
                      {idx > 0 && arr[idx - 1] !== i - 1 && <span className="px-1 text-xs text-slate-400">...</span>}
                      <button
                        onClick={() => setCurrentPage(i)}
                        className={`px-3 py-1.5 text-xs rounded-lg font-medium ${i === currentPage ? 'text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        style={i === currentPage ? { background: '#1a3a6c' } : {}}
                      >
                        {i}
                      </button>
                    </div>
                  ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium ${currentPage === totalPages ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'text-white hover:opacity-90'}`}
                  style={currentPage !== totalPages ? { background: '#1a3a6c' } : {}}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
        </div>
      </main>

      {/* View Details Modal */}
      {showModal && selectedStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between" style={{ background: '#1a3a6c' }}>
              <h3 className="text-sm font-bold text-white">Student BMI Details</h3>
              <button onClick={() => { setShowModal(false); setSelectedStudent(null); setStudentHistory([]); }} className="text-white/70 hover:text-white">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-lg p-2.5">
                  <p className="text-xs text-slate-500">LRN</p>
                  <p className="text-sm font-semibold text-slate-800">{selectedStudent.lrn}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2.5">
                  <p className="text-xs text-slate-500">Name</p>
                  <p className="text-sm font-semibold text-slate-800">
                    {selectedStudent.first_name} {selectedStudent.middle_name || ''}{' '}
                    {selectedStudent.last_name}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2.5">
                  <p className="text-xs text-slate-500">Age</p>
                  <p className="text-sm font-semibold text-slate-800">{selectedStudent.age} yrs old</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2.5">
                  <p className="text-xs text-slate-500">Gender</p>
                  <p className="text-sm font-semibold text-slate-800">{selectedStudent.gender}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2.5">
                  <p className="text-xs text-slate-500">Grade Level</p>
                  <p className="text-sm font-semibold text-slate-800">{selectedStudent.grade_level === 0 || selectedStudent.grade_level === '0' ? 'Kinder' : `Grade ${selectedStudent.grade_level}`}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2.5">
                  <p className="text-xs text-slate-500">Section</p>
                  <p className="text-sm font-semibold text-slate-800">{selectedStudent.section || 'N/A'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2.5">
                  <p className="text-xs text-slate-500">Parent/Guardian</p>
                  <p className="text-sm font-semibold text-slate-800">{selectedStudent.parent_guardian || 'N/A'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2.5">
                  <p className="text-xs text-slate-500">Contact Number</p>
                  <p className="text-sm font-semibold text-slate-800">{selectedStudent.contact_number || 'N/A'}</p>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-700 mb-2">BMI History</h4>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: '#1a3a6c' }}>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-white">Date</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-white">Weight</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-white">Height</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-white">BMI</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-white">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {studentHistory.map((record: any) => (
                        <tr key={record.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 text-xs text-slate-700">
                            {new Date(record.measured_at).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-700">{record.weight} kg</td>
                          <td className="px-3 py-2 text-xs text-slate-700">{record.height} cm</td>
                          <td className="px-3 py-2 text-xs font-semibold text-slate-800">{record.bmi}</td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getBMIStatusClass(record.bmi_status)}`}>
                              {record.bmi_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => { setShowModal(false); setSelectedStudent(null); setStudentHistory([]); }}
                className="px-4 py-2 text-sm font-medium bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
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
