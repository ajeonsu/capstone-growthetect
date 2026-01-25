'use client';

import { useEffect, useState } from 'react';
import NutritionistSidebar from '@/components/NutritionistSidebar';
import { calculateBMI, getBMIStatus } from '@/lib/helpers';

export default function BMITrackingPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [bmiRecords, setBmiRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [grade, setGrade] = useState('');
  const [status, setStatus] = useState('');
  const [hfaStatus, setHfaStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [calculatedBMI, setCalculatedBMI] = useState<number | null>(null);
  const [bmiStatus, setBmiStatus] = useState('');
  const [formError, setFormError] = useState('');
  const itemsPerPage = 15;

  useEffect(() => {
    loadStudents();
    loadBMIRecords();
  }, []);

  useEffect(() => {
    loadBMIRecords();
  }, [search, month, year, grade, status, hfaStatus]);

  const loadStudents = async () => {
    try {
      const response = await fetch('/api/students');
      const data = await response.json();
      if (data.success) {
        setStudents(data.students);
      }
    } catch (error) {
      console.error('Error loading students:', error);
    }
  };

  const loadBMIRecords = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (month && year) {
        // Create a date string in YYYY-MM-DD format (first day of the month)
        const dateStr = `${year}-${month.padStart(2, '0')}-01`;
        params.append('date', dateStr);
      }
      if (grade) params.append('grade', grade);
      if (status) params.append('status', status);
      if (hfaStatus) params.append('hfaStatus', hfaStatus);

      const response = await fetch(`/api/bmi-records?${params}`, {
        credentials: 'include', // Include cookies for authentication
      });
      const data = await response.json();

      if (data.success) {
        setBmiRecords(data.records);
        setCurrentPage(1);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading BMI records:', error);
      setLoading(false);
    }
  };

  const handleCalculateBMI = (weight: number, height: number) => {
    if (weight && height) {
      const bmi = calculateBMI(weight, height);
      const status = getBMIStatus(bmi);
      setCalculatedBMI(bmi);
      setBmiStatus(status);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const formData = new FormData(e.target as HTMLFormElement);
    const weight = parseFloat(formData.get('weight') as string);
    const height = parseFloat(formData.get('height') as string);

    if (!weight || !height) {
      setFormError('Weight and height are required');
      return;
    }

    // Validate weight range (5-150 kg for students)
    if (weight < 5 || weight > 150) {
      setFormError('Weight must be between 5 and 150 kg for students');
      return;
    }

    // Validate height range (50-200 cm for students)
    if (height < 50 || height > 200) {
      setFormError('Height must be between 50 and 200 cm for students');
      return;
    }

    // Calculate BMI to check if it's reasonable
    const bmi = calculateBMI(weight, height);
    if (bmi > 100 || bmi < 5) {
      setFormError(`Invalid BMI calculation (${bmi.toFixed(2)}). Please check weight and height values.`);
      return;
    }

    try {
      const response = await fetch('/api/bmi-records', {
        method: 'POST',
        credentials: 'include', // Include cookies for authentication
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        alert('BMI recorded successfully');
        setShowModal(false);
        setCalculatedBMI(null);
        setBmiStatus('');
        loadBMIRecords();
      } else {
        setFormError(data.message);
      }
    } catch (error) {
      setFormError('An error occurred. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Severely Wasted': 'bg-red-100 text-red-800',
      'Wasted': 'bg-orange-100 text-orange-800',
      'Normal': 'bg-green-100 text-green-800',
      'Overweight': 'bg-yellow-100 text-yellow-800',
      'Obese': 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getHFAStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Severely Stunted': 'bg-red-100 text-red-800',
      'Stunted': 'bg-orange-100 text-orange-800',
      'Normal': 'bg-green-100 text-green-800',
      'Tall': 'bg-blue-100 text-blue-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const paginatedRecords = bmiRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(bmiRecords.length / itemsPerPage);
  const startRecord = bmiRecords.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endRecord = Math.min(currentPage * itemsPerPage, bmiRecords.length);

  return (
    <div className="bg-gray-100 min-h-screen">
      <NutritionistSidebar />
      <main className="md:ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800">BMI Tracking</h1>
            <button
              onClick={() => {
                setShowModal(true);
                if (students.length === 0) loadStudents();
              }}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Record BMI
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[150px]">
                <label className="block text-gray-700 text-sm font-medium mb-2">Month</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select Month</option>
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

              <div className="flex-1 min-w-[150px]">
                <label className="block text-gray-700 text-sm font-medium mb-2">Year</label>
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select Year</option>
                  {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="block text-gray-700 text-sm font-medium mb-2">Search Student</label>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    clearTimeout((window as any).searchTimeout);
                    (window as any).searchTimeout = setTimeout(() => setSearch(e.target.value), 500);
                  }}
                  placeholder="Search student..."
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="flex-1 min-w-[150px]">
                <label className="block text-gray-700 text-sm font-medium mb-2">Grade Level</label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
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
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
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

              <div className="flex-1 min-w-[200px]">
                <label className="block text-gray-700 text-sm font-medium mb-2">HFA Status</label>
                <select
                  value={hfaStatus}
                  onChange={(e) => setHfaStatus(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">All</option>
                  <option value="Severely Stunted">Severely Stunted</option>
                  <option value="Stunted">Stunted</option>
                  <option value="Normal">Normal</option>
                  <option value="Tall">Tall</option>
                </select>
              </div>
            </div>
          </div>

          {/* BMI Records Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-green-600 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Student</th>
                    <th className="px-4 py-3 text-left">Grade</th>
                    <th className="px-4 py-3 text-left">Age</th>
                    <th className="px-4 py-3 text-left">Weight (kg)</th>
                    <th className="px-4 py-3 text-left">Height (cm)</th>
                    <th className="px-4 py-3 text-left">BMI</th>
                    <th className="px-4 py-3 text-left">BMI Status</th>
                    <th className="px-4 py-3 text-left">HFA Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                        Loading BMI records...
                      </td>
                    </tr>
                  ) : paginatedRecords.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                        No BMI records found
                      </td>
                    </tr>
                  ) : (
                    paginatedRecords.map((record) => {
                      const recordDate = new Date(record.measured_at).toLocaleDateString();
                      return (
                        <tr key={record.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">{recordDate}</td>
                          <td className="px-4 py-3">
                            {record.first_name} {record.last_name}
                          </td>
                          <td className="px-4 py-3">Grade {record.grade_level}</td>
                          <td className="px-4 py-3">{record.age}</td>
                          <td className="px-4 py-3">{parseFloat(record.weight).toFixed(1)}</td>
                          <td className="px-4 py-3">{parseFloat(record.height).toFixed(1)}</td>
                          <td className="px-4 py-3">{parseFloat(record.bmi).toFixed(2)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(record.bmi_status)}`}>
                              {record.bmi_status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs font-semibold rounded ${getHFAStatusColor(record.height_for_age_status)}`}>
                              {record.height_for_age_status || 'N/A'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {bmiRecords.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing <span>{startRecord}</span> to <span>{endRecord}</span> of{' '}
                  <span>{bmiRecords.length}</span> records
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
      </main>

      {/* Record BMI Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full mx-4">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">Record BMI Measurement</h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="studentSelect" className="block text-sm font-medium text-gray-700 mb-1">
                  Select Student *
                </label>
                <select
                  id="studentSelect"
                  name="student_id"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Choose a student...</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.first_name} {s.last_name} (Grade {s.grade_level})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="weight" className="block text-sm font-medium text-gray-700 mb-1">
                    Weight (kg) *
                  </label>
                  <input
                    type="number"
                    id="weight"
                    name="weight"
                    step="0.1"
                    required
                    onChange={(e) => {
                      const weight = parseFloat(e.target.value);
                      const heightInput = document.getElementById('height') as HTMLInputElement;
                      const height = parseFloat(heightInput?.value || '0');
                      if (weight && height) handleCalculateBMI(weight, height);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label htmlFor="height" className="block text-sm font-medium text-gray-700 mb-1">
                    Height (cm) *
                  </label>
                  <input
                    type="number"
                    id="height"
                    name="height"
                    step="0.1"
                    required
                    onChange={(e) => {
                      const height = parseFloat(e.target.value);
                      const weightInput = document.getElementById('weight') as HTMLInputElement;
                      const weight = parseFloat(weightInput?.value || '0');
                      if (weight && height) handleCalculateBMI(weight, height);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Calculated BMI</p>
                    <p className="text-2xl font-bold text-gray-800">
                      {calculatedBMI !== null ? calculatedBMI.toFixed(2) : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <p className={`text-2xl font-bold ${
                      bmiStatus === 'Severely Wasted' ? 'text-red-600' :
                      bmiStatus === 'Wasted' ? 'text-orange-600' :
                      bmiStatus === 'Normal' ? 'text-green-600' :
                      bmiStatus === 'Overweight' ? 'text-yellow-600' :
                      bmiStatus === 'Obese' ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {bmiStatus || '-'}
                    </p>
                  </div>
                </div>
              </div>

              <input type="hidden" name="source" value="manual" />

              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {formError}
                </div>
              )}

              <div className="flex justify-end space-x-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setCalculatedBMI(null);
                    setBmiStatus('');
                    setFormError('');
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
