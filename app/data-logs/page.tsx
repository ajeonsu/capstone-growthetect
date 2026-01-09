'use client';

import { useEffect, useState } from 'react';
import NutritionistSidebar from '@/components/NutritionistSidebar';

export default function DataLogsPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    date: '',
    name: '',
    gender: '',
    grade: '',
    status: '',
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
      const params = new URLSearchParams();
      if (filters.date) params.append('date', filters.date);
      if (filters.name) params.append('search', filters.name);
      if (filters.gender) params.append('gender', filters.gender);
      if (filters.grade) params.append('grade', filters.grade);
      if (filters.status) params.append('status', filters.status);

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

  const paginatedRecords = records.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(records.length / itemsPerPage);
  const startRecord = records.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endRecord = Math.min(currentPage * itemsPerPage, records.length);

  return (
    <div className="bg-gray-50 min-h-screen">
      <NutritionistSidebar />

      <div className="md:ml-64 p-6 transition-all duration-300">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Data Logs</h1>
          <p className="text-gray-600">View all BMI records and measurements</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-gray-700 text-sm font-medium mb-2">Date</label>
              <input
                type="date"
                value={filters.date}
                onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-gray-700 text-sm font-medium mb-2">Search Name</label>
              <input
                type="text"
                value={filters.name}
                onChange={(e) => {
                  setFilters({ ...filters, name: e.target.value });
                  clearTimeout((window as any).searchTimeout);
                  (window as any).searchTimeout = setTimeout(() => setFilters({ ...filters, name: e.target.value }), 500);
                }}
                placeholder="Enter name..."
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="block text-gray-700 text-sm font-medium mb-2">Gender</label>
              <select
                value={filters.gender}
                onChange={(e) => setFilters({ ...filters, gender: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">All</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="block text-gray-700 text-sm font-medium mb-2">Grade Level</label>
              <select
                value={filters.grade}
                onChange={(e) => setFilters({ ...filters, grade: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">All</option>
                <option value="0">Kinder</option>
                <option value="1">Grade 1</option>
                <option value="2">Grade 2</option>
                <option value="3">Grade 3</option>
                <option value="4">Grade 4</option>
                <option value="5">Grade 5</option>
                <option value="6">Grade 6</option>
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-gray-700 text-sm font-medium mb-2">BMI Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">All</option>
                <option value="Severely Wasted">Severely Wasted</option>
                <option value="Wasted">Wasted</option>
                <option value="Normal">Normal</option>
                <option value="Overweight">Overweight</option>
                <option value="Obese">Obese</option>
              </select>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-green-600 text-white">
                <tr>
                  <th className="px-4 py-3 text-left">LRN No.</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Age</th>
                  <th className="px-4 py-3 text-left">Gender</th>
                  <th className="px-4 py-3 text-left">Grade Level</th>
                  <th className="px-4 py-3 text-left">Weight (kg)</th>
                  <th className="px-4 py-3 text-left">Height (cm)</th>
                  <th className="px-4 py-3 text-left">BMI</th>
                  <th className="px-4 py-3 text-left">BMI Status</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : paginatedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                      No records found
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((record) => (
                    <tr key={record.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">{record.lrn}</td>
                      <td className="px-4 py-3">
                        {record.first_name} {record.last_name}
                      </td>
                      <td className="px-4 py-3">{record.age}</td>
                      <td className="px-4 py-3">{record.gender}</td>
                      <td className="px-4 py-3">Grade {record.grade_level}</td>
                      <td className="px-4 py-3">{record.weight}</td>
                      <td className="px-4 py-3">{record.height}</td>
                      <td className="px-4 py-3">{record.bmi}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-sm font-medium ${getBMIStatusClass(record.bmi_status)}`}>
                          {record.bmi_status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {new Date(record.measured_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => viewDetails(record.student_id)}
                          className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
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
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing <span>{startRecord}</span> to <span>{endRecord}</span> of{' '}
                <span>{records.length}</span> records
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

      {/* View Details Modal */}
      {showModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Student BMI Details</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">LRN</p>
                  <p className="font-semibold">{selectedStudent.lrn}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="font-semibold">
                    {selectedStudent.first_name} {selectedStudent.middle_name || ''}{' '}
                    {selectedStudent.last_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Age</p>
                  <p className="font-semibold">{selectedStudent.age} years old</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Gender</p>
                  <p className="font-semibold">{selectedStudent.gender}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Grade Level</p>
                  <p className="font-semibold">Grade {selectedStudent.grade_level}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Section</p>
                  <p className="font-semibold">{selectedStudent.section || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Parent/Guardian</p>
                  <p className="font-semibold">{selectedStudent.parent_guardian || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Contact Number</p>
                  <p className="font-semibold">{selectedStudent.contact_number || 'N/A'}</p>
                </div>
              </div>
              <div className="mt-6">
                <h4 className="font-bold text-lg mb-3">BMI History</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-3 py-2 text-left">Date</th>
                        <th className="px-3 py-2 text-left">Weight</th>
                        <th className="px-3 py-2 text-left">Height</th>
                        <th className="px-3 py-2 text-left">BMI</th>
                        <th className="px-3 py-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentHistory.map((record: any) => (
                        <tr key={record.id} className="border-b">
                          <td className="px-3 py-2">
                            {new Date(record.measured_at).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-2">{record.weight} kg</td>
                          <td className="px-3 py-2">{record.height} cm</td>
                          <td className="px-3 py-2">{record.bmi}</td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-1 rounded text-xs ${getBMIStatusClass(record.bmi_status)}`}>
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
            <div className="mt-6">
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedStudent(null);
                  setStudentHistory([]);
                }}
                className="px-6 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-700"
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
