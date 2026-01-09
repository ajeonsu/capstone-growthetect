'use client';

import { useEffect, useState } from 'react';
import NutritionistSidebar from '@/components/NutritionistSidebar';

export default function NutritionistOverviewPage() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  useEffect(() => {
    loadDashboardData();
    loadMonthlyRecords();
  }, [selectedGrade]);

  useEffect(() => {
    loadMonthlyRecords();
  }, [selectedYear]);

  const loadDashboardData = async () => {
    try {
      // Get all students
      const studentsResponse = await fetch('/api/students', {
        credentials: 'include', // Include cookies for authentication
      });
      const studentsData = await studentsResponse.json();

      // Filter students by grade if selected
      let filteredStudents = studentsData.success ? studentsData.students : [];
      if (selectedGrade !== '') {
        filteredStudents = filteredStudents.filter((student: any) => student.grade_level == selectedGrade);
      }
      const totalStudents = filteredStudents.length;

      // Get student IDs for filtering BMI records
      const studentIds = new Set(filteredStudents.map((s: any) => s.id));

      // Get all BMI records
      const bmiResponse = await fetch('/api/bmi-records', {
        credentials: 'include', // Include cookies for authentication
      });
      const bmiData = await bmiResponse.json();

      if (bmiData.success) {
        // Filter BMI records by selected grade students
        let relevantRecords = bmiData.records;
        if (selectedGrade !== '') {
          relevantRecords = relevantRecords.filter((record: any) => studentIds.has(record.student_id));
        }

        // Get latest BMI record for each student
        const latestRecords: Record<number, any> = {};
        relevantRecords.forEach((record: any) => {
          if (!latestRecords[record.student_id] ||
            new Date(record.measured_at) > new Date(latestRecords[record.student_id].measured_at)) {
            latestRecords[record.student_id] = record;
          }
        });

        // Count by BMI status
        const statusCounts = {
          'Severely Wasted': 0,
          'Wasted': 0,
          'Normal': 0,
          'Overweight': 0,
          'Obese': 0
        };

        Object.values(latestRecords).forEach((record: any) => {
          if (statusCounts.hasOwnProperty(record.bmi_status)) {
            statusCounts[record.bmi_status as keyof typeof statusCounts]++;
          }
        });

        setDashboardData({
          totalStudents,
          statusCounts,
        });
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setLoading(false);
    }
  };

  const loadMonthlyRecords = async () => {
    try {
      const response = await fetch('/api/bmi-records', {
        credentials: 'include', // Include cookies for authentication
      });
      const data = await response.json();

      if (data.success) {
        // Group records by month for selected year
        const monthlyData: Record<string, { count: number; students: Set<number> }> = {};

        data.records.forEach((record: any) => {
          const date = new Date(record.measured_at);
          const year = date.getFullYear();
          const month = date.getMonth() + 1;

          if (year.toString() === selectedYear) {
            const monthKey = String(month).padStart(2, '0');

            if (!monthlyData[monthKey]) {
              monthlyData[monthKey] = {
                count: 0,
                students: new Set()
              };
            }

            monthlyData[monthKey].count++;
            monthlyData[monthKey].students.add(record.student_id);
          }
        });

        displayMonthlyRecords(monthlyData, selectedYear);
      }
    } catch (error) {
      console.error('Error loading monthly records:', error);
      const container = document.getElementById('monthlyRecords');
      if (container) {
        container.innerHTML = '<p class="col-span-full text-gray-500 text-center py-8">Error loading monthly records</p>';
      }
    }
  };

  const displayMonthlyRecords = (monthlyData: Record<string, { count: number; students: Set<number> }>, year: string) => {
    const container = document.getElementById('monthlyRecords');
    if (!container) return;

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const colors = [
      'bg-blue-50 border-blue-200 text-blue-800',
      'bg-green-50 border-green-200 text-green-800',
      'bg-purple-50 border-purple-200 text-purple-800',
      'bg-pink-50 border-pink-200 text-pink-800',
      'bg-indigo-50 border-indigo-200 text-indigo-800',
      'bg-yellow-50 border-yellow-200 text-yellow-800',
      'bg-cyan-50 border-cyan-200 text-cyan-800',
      'bg-orange-50 border-orange-200 text-orange-800',
      'bg-red-50 border-red-200 text-red-800',
      'bg-teal-50 border-teal-200 text-teal-800',
      'bg-lime-50 border-lime-200 text-lime-800',
      'bg-amber-50 border-amber-200 text-amber-800'
    ];

    container.innerHTML = monthNames.map((monthName, index) => {
      const monthKey = String(index + 1).padStart(2, '0');
      const data = monthlyData[monthKey] || { count: 0, students: new Set() };
      const colorClass = colors[index];

      return `
        <div class="border-2 ${colorClass} rounded-lg p-6 hover:shadow-lg transition-shadow">
          <div class="flex items-center justify-between mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span class="text-4xl font-bold">${data.count}</span>
          </div>
          <h3 class="text-lg font-semibold mb-2">${monthName} ${year}</h3>
          <div class="space-y-1 text-sm opacity-75">
            <p>${data.students.size} unique student${data.students.size !== 1 ? 's' : ''}</p>
            <p>${data.count} BMI record${data.count !== 1 ? 's' : ''}</p>
          </div>
        </div>
      `;
    }).join('');
  };

  const populateYearFilter = () => {
    const currentYear = new Date().getFullYear();
    const startYear = 2024;
    const years = [];
    for (let year = currentYear; year >= startYear; year--) {
      years.push(year);
    }
    return years;
  };

  const statusCounts = dashboardData?.statusCounts || {
    'Severely Wasted': 0,
    'Wasted': 0,
    'Normal': 0,
    'Overweight': 0,
    'Obese': 0
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      <NutritionistSidebar />
      <main className="md:ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800">Overview</h1>
            <div className="flex items-center space-x-2">
              <label htmlFor="gradeFilter" className="text-sm font-medium text-gray-700">Grade Level:</label>
              <select
                id="gradeFilter"
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
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
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-xs font-medium uppercase">Total Students</p>
                  <p className="text-3xl font-bold text-blue-600 mt-2">{dashboardData?.totalStudents || 0}</p>
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
                  <p className="text-gray-500 text-xs font-medium uppercase">Severely Wasted</p>
                  <p className="text-3xl font-bold text-red-600 mt-2">{statusCounts['Severely Wasted']}</p>
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
                  <p className="text-gray-500 text-xs font-medium uppercase">Wasted</p>
                  <p className="text-3xl font-bold text-orange-600 mt-2">{statusCounts['Wasted']}</p>
                </div>
                <div className="bg-orange-100 rounded-full p-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-xs font-medium uppercase">Normal</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">{statusCounts['Normal']}</p>
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
                  <p className="text-gray-500 text-xs font-medium uppercase">Overweight</p>
                  <p className="text-3xl font-bold text-yellow-600 mt-2">{statusCounts['Overweight']}</p>
                </div>
                <div className="bg-yellow-100 rounded-full p-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-xs font-medium uppercase">Obese</p>
                  <p className="text-3xl font-bold text-purple-600 mt-2">{statusCounts['Obese']}</p>
                </div>
                <div className="bg-purple-100 rounded-full p-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Records */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Monthly BMI Records</h2>
              <div className="flex items-center space-x-2">
                <label htmlFor="yearFilter" className="text-sm font-medium text-gray-700">Year:</label>
                <select
                  id="yearFilter"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {populateYearFilter().map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
            <div id="monthlyRecords" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <p className="col-span-full text-gray-500 text-center py-8">Loading monthly records...</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
