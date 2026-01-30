'use client';

import { useEffect, useState } from 'react';
import NutritionistSidebar from '@/components/NutritionistSidebar';

interface SummaryData {
  totalStudents: number;
  pupilsWeighed: number;
  bmiCounts: {
    severelyWasted: number;
    wasted: number;
    underweight: number;
    normal: number;
    overweight: number;
    obese: number;
  };
  hfaCounts: {
    severelyStunted: number;
    stunted: number;
    normal: number;
    tall: number;
  };
  feedingProgram: {
    primary: number;
    secondary: number;
    total: number;
  };
}

export default function NutritionistOverviewPage() {
  const [dashboardData, setDashboardData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  useEffect(() => {
    loadDashboardData();
    loadMonthlyRecords();
  }, []);

  useEffect(() => {
    loadMonthlyRecords();
  }, [selectedYear]);

  const loadDashboardData = async () => {
    try {
      // Get all students
      const studentsResponse = await fetch('/api/students', {
        credentials: 'include',
      });
      const studentsData = await studentsResponse.json();

      // Get all students
      const allStudents = studentsData.success ? studentsData.students : [];
      const totalStudents = allStudents.length;

      // Get student IDs for filtering BMI records
      const studentIds = new Set(allStudents.map((s: any) => s.id));

      // Get all BMI records
      const bmiResponse = await fetch('/api/bmi-records', {
        credentials: 'include',
      });
      const bmiData = await bmiResponse.json();

      // Get feeding program data
      const feedingProgramResponse = await fetch('/api/feeding-program?type=programs', {
        credentials: 'include',
      });
      const feedingProgramData = await feedingProgramResponse.json();

      if (bmiData.success) {
        // Get all BMI records
        const relevantRecords = bmiData.records;

        // Get latest BMI record for each student
        const latestRecords: Record<number, any> = {};
        relevantRecords.forEach((record: any) => {
          if (!latestRecords[record.student_id] ||
            new Date(record.measured_at) > new Date(latestRecords[record.student_id].measured_at)) {
            latestRecords[record.student_id] = record;
          }
        });

        const pupilsWeighed = Object.keys(latestRecords).length;

        // Count by BMI status
        const bmiCounts = {
          severelyWasted: 0,
          wasted: 0,
          underweight: 0,
          normal: 0,
          overweight: 0,
          obese: 0
        };

        // Count by HFA status
        const hfaCounts = {
          severelyStunted: 0,
          stunted: 0,
          normal: 0,
          tall: 0
        };

        Object.values(latestRecords).forEach((record: any) => {
          // BMI Status counting
          if (record.bmi_status === 'Severely Wasted') {
            bmiCounts.severelyWasted++;
          } else if (record.bmi_status === 'Wasted') {
            bmiCounts.wasted++;
          } else if (record.bmi_status === 'Underweight') {
            bmiCounts.underweight++;
          } else if (record.bmi_status === 'Normal') {
            bmiCounts.normal++;
          } else if (record.bmi_status === 'Overweight') {
            bmiCounts.overweight++;
          } else if (record.bmi_status === 'Obese') {
            bmiCounts.obese++;
          }

          // HFA Status counting
          if (record.height_for_age_status === 'Severely Stunted') {
            hfaCounts.severelyStunted++;
          } else if (record.height_for_age_status === 'Stunted') {
            hfaCounts.stunted++;
          } else if (record.height_for_age_status === 'Normal') {
            hfaCounts.normal++;
          } else if (record.height_for_age_status === 'Tall') {
            hfaCounts.tall++;
          }
        });

        // Count feeding program beneficiaries
        let primaryCount = 0;
        let secondaryCount = 0;

        if (feedingProgramData.success && feedingProgramData.programs) {
          const activePrograms = feedingProgramData.programs.filter((p: any) => p.status === 'active');
          
          // Track which students are enrolled and their statuses
          const enrolledStudents = new Map<number, { isPrimary: boolean; isSecondary: boolean }>();

          for (const program of activePrograms) {
            const beneficiariesResponse = await fetch(`/api/feeding-program?type=beneficiaries&program_id=${program.id}`, {
              credentials: 'include',
            });
            const beneficiariesData = await beneficiariesResponse.json();

            if (beneficiariesData.success && beneficiariesData.beneficiaries) {
              console.log(`[OVERVIEW] Program ${program.id} beneficiaries:`, beneficiariesData.beneficiaries);
              
              beneficiariesData.beneficiaries.forEach((b: any) => {
                // Count all enrolled students
                if (studentIds.has(b.student_id)) {
                  const hasBadBMI = b.bmi_status_at_enrollment === 'Severely Wasted' || 
                                    b.bmi_status_at_enrollment === 'Wasted';
                  const hasBadHFA = b.height_for_age_status_at_enrollment === 'Severely Stunted' ||
                                    b.height_for_age_status_at_enrollment === 'Stunted';
                  
                  // Primary = Has bad BMI (Severely Wasted/Wasted)
                  // Secondary = Has bad HFA (Severely Stunted/Stunted) but NOT bad BMI
                  const isPrimary = hasBadBMI;
                  const isSecondary = hasBadHFA && !hasBadBMI;

                  console.log(`[OVERVIEW] Student ${b.student_id}: BMI=${b.bmi_status_at_enrollment}, HFA=${b.height_for_age_status_at_enrollment}, Primary=${isPrimary}, Secondary=${isSecondary}`);

                  if (!enrolledStudents.has(b.student_id)) {
                    enrolledStudents.set(b.student_id, { isPrimary: false, isSecondary: false });
                  }

                  const existing = enrolledStudents.get(b.student_id)!;
                  if (isPrimary) {
                    existing.isPrimary = true;
                  }
                  if (isSecondary) {
                    existing.isSecondary = true;
                  }
                }
              });
            }
          }

          // Count primary and secondary beneficiaries
          enrolledStudents.forEach((value, studentId) => {
            if (value.isPrimary) {
              primaryCount++;
              console.log(`[OVERVIEW] Student ${studentId} counted as PRIMARY`);
            } else if (value.isSecondary) {
              secondaryCount++;
              console.log(`[OVERVIEW] Student ${studentId} counted as SECONDARY`);
            }
          });
          
          console.log(`[OVERVIEW] Final counts - Primary: ${primaryCount}, Secondary: ${secondaryCount}, Total: ${primaryCount + secondaryCount}`);
        }

        const summaryData: SummaryData = {
          totalStudents,
          pupilsWeighed,
          bmiCounts,
          hfaCounts,
          feedingProgram: {
            primary: primaryCount,
            secondary: secondaryCount,
            total: primaryCount + secondaryCount
          }
        };

        setDashboardData(summaryData);
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
        <div class="border-2 ${colorClass} rounded-lg p-3 hover:shadow-md transition-shadow">
          <div class="flex items-center justify-between mb-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span class="text-2xl font-bold">${data.count}</span>
          </div>
          <h3 class="text-sm font-semibold mb-1">${monthName} ${year}</h3>
          <div class="space-y-0.5 text-xs opacity-75">
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

  return (
    <div className="bg-gray-100 min-h-screen">
      <NutritionistSidebar />
      <main className="md:ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800">Overview</h1>
          </div>

          {/* KPI Summary Cards */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
              <p className="mt-4 text-gray-600">Loading data...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* BMI Status Card */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-800">Body Mass Index (BMI)</h2>
                  <div className="bg-blue-100 rounded-full p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm font-medium text-gray-700">Total Students:</span>
                    <span className="text-lg font-bold text-blue-600">{dashboardData?.totalStudents || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm font-medium text-gray-700">Pupils Weighed:</span>
                    <span className="text-lg font-bold text-blue-600">{dashboardData?.pupilsWeighed || 0}</span>
                  </div>
                  <div className="border-t pt-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Severely Wasted:</span>
                      <span className="font-semibold text-red-600">{dashboardData?.bmiCounts.severelyWasted || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Wasted:</span>
                      <span className="font-semibold text-orange-600">{dashboardData?.bmiCounts.wasted || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Underweight:</span>
                      <span className="font-semibold text-yellow-600">{dashboardData?.bmiCounts.underweight || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Normal:</span>
                      <span className="font-semibold text-green-600">{dashboardData?.bmiCounts.normal || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Overweight:</span>
                      <span className="font-semibold text-purple-600">{dashboardData?.bmiCounts.overweight || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Obese:</span>
                      <span className="font-semibold text-pink-600">{dashboardData?.bmiCounts.obese || 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Height For Age Card */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-800">Height For Age (HFA)</h2>
                  <div className="bg-green-100 rounded-full p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm font-medium text-gray-700">Total Students:</span>
                    <span className="text-lg font-bold text-green-600">{dashboardData?.totalStudents || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm font-medium text-gray-700">Pupils Taken Height:</span>
                    <span className="text-lg font-bold text-green-600">{dashboardData?.pupilsWeighed || 0}</span>
                  </div>
                  <div className="border-t pt-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Severely Stunted:</span>
                      <span className="font-semibold text-red-600">{dashboardData?.hfaCounts.severelyStunted || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Stunted:</span>
                      <span className="font-semibold text-orange-600">{dashboardData?.hfaCounts.stunted || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Normal:</span>
                      <span className="font-semibold text-green-600">{dashboardData?.hfaCounts.normal || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Tall:</span>
                      <span className="font-semibold text-blue-600">{dashboardData?.hfaCounts.tall || 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feeding Program Card */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-800">Feeding Program</h2>
                  <div className="bg-purple-100 rounded-full p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm font-medium text-gray-700">Total Students:</span>
                    <span className="text-lg font-bold text-purple-600">{dashboardData?.totalStudents || 0}</span>
                  </div>
                  <div className="border-t pt-3 space-y-3">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-red-800">Primary Beneficiaries</span>
                        <span className="text-2xl font-bold text-red-600">{dashboardData?.feedingProgram.primary || 0}</span>
                      </div>
                      <p className="text-xs text-red-600">Students with Severely Wasted/Wasted BMI status</p>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-blue-800">Secondary Beneficiaries</span>
                        <span className="text-2xl font-bold text-blue-600">{dashboardData?.feedingProgram.secondary || 0}</span>
                      </div>
                      <p className="text-xs text-blue-600">Students with Severely Stunted/Stunted HFA (but Normal BMI)</p>
                    </div>
                    <div className="bg-green-50 border-2 border-green-400 rounded-lg p-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-green-800">Total Enrolled</span>
                        <span className="text-3xl font-bold text-green-600">{dashboardData?.feedingProgram.total || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Monthly Records */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">Monthly BMI Records</h2>
              <div className="flex items-center space-x-2">
                <label htmlFor="yearFilter" className="text-xs font-medium text-gray-700">Year:</label>
                <select
                  id="yearFilter"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {populateYearFilter().map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
            <div id="monthlyRecords" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              <p className="col-span-full text-gray-500 text-center py-8">Loading monthly records...</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
