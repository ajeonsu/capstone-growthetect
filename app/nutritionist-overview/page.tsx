'use client';

import React, { useEffect, useRef, useState } from 'react';
import NutritionistSidebar from '@/components/NutritionistSidebar';
import { Modal } from '@/components/ui/Modal';

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

interface GradeData {
  gradeLevel: string;
  enrollment: { M: number; F: number; Total: number };
  bmi: {
    pupilsWeighed: { M: number; F: number; Total: number };
    severelyWasted: { M: number; F: number; Total: number; percent: number };
    wasted: { M: number; F: number; Total: number; percent: number };
    underweight: { M: number; F: number; Total: number };
    normal: { M: number; F: number; Total: number; percent: number };
    overweight: { M: number; F: number; Total: number; percent: number };
    obese: { M: number; F: number; Total: number; percent: number };
    primaryBeneficiaries: { M: number; F: number; Total: number };
  };
  hfa: {
    pupilsTakenHeight: { M: number; F: number; Total: number };
    severelyStunted: { M: number; F: number; Total: number; percent: number };
    stunted: { M: number; F: number; Total: number; percent: number };
    severelyStuntedNotSW: { M: number; F: number; Total: number };
    stuntedNotSW: { M: number; F: number; Total: number };
    secondaryBeneficiaries: { M: number; F: number; Total: number };
    normal: { M: number; F: number; Total: number; percent: number };
    tall: { M: number; F: number; Total: number; percent: number };
  };
  totalBeneficiaries?: { M: number; F: number; Total: number };
}

export default function NutritionistOverviewPage() {
  const [dashboardData, setDashboardData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportFormat, setReportFormat] = useState<'detailed' | 'simple'>('detailed');
  const [reportData, setReportData] = useState<GradeData[]>([]);
  const [generating, setGenerating] = useState(false);
  const [approvedReportsCount, setApprovedReportsCount] = useState(0);

  // Cache all BMI records so year-filter changes don't re-fetch
  const allBmiRecordsRef = useRef<any[]>([]);

  useEffect(() => {
    // Run all independent initial loads in parallel
    Promise.all([loadKpiSummary(), loadBmiRecordsForMonthly(), loadApprovedReportsCount()]);
  }, []);

  useEffect(() => {
    // Re-display monthly view using cached records (no network request)
    if (allBmiRecordsRef.current.length > 0) {
      buildMonthlyDisplay(allBmiRecordsRef.current, selectedYear);
    }
  }, [selectedYear]);

  /** Single-request KPI load — replaces 3 sequential fetches + N+1 beneficiary loop */
  const loadKpiSummary = async () => {
    try {
      const res = await fetch('/api/kpi-summary', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setDashboardData({
          totalStudents: data.totalStudents,
          pupilsWeighed: data.pupilsWeighed,
          bmiCounts: data.bmiCounts,
          hfaCounts: data.hfaCounts,
          feedingProgram: data.feedingProgram,
        });
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading KPI summary:', error);
      setLoading(false);
    }
  };

  const loadApprovedReportsCount = async () => {
    try {
      const response = await fetch('/api/reports', { credentials: 'include' });
      const data = await response.json();
      if (data.success && data.reports) {
        setApprovedReportsCount(data.reports.filter((r: any) => r.status === 'approved').length);
      }
    } catch (error) {
      console.error('Error loading approved reports count:', error);
    }
  };

  /** Fetch BMI records for monthly display (latest per student is enough) */
  const loadBmiRecordsForMonthly = async () => {
    try {
      const response = await fetch('/api/bmi-records?latest_only=true', { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        allBmiRecordsRef.current = data.records;
        buildMonthlyDisplay(data.records, selectedYear);
      }
    } catch (error) {
      console.error('Error loading monthly records:', error);
      const container = document.getElementById('monthlyRecords');
      if (container) {
        container.innerHTML = '<p class="col-span-full text-gray-500 text-center py-8">Error loading monthly records</p>';
      }
    }
  };

  /** Pure display function — no network calls, just filters cached records */
  const buildMonthlyDisplay = (records: any[], year: string) => {
    const monthlyData: Record<string, { count: number; students: Set<number> }> = {};
    records.forEach((record: any) => {
      const date = new Date(record.measured_at);
      if (date.getFullYear().toString() !== year) return;
      const monthKey = String(date.getMonth() + 1).padStart(2, '0');
      if (!monthlyData[monthKey]) monthlyData[monthKey] = { count: 0, students: new Set() };
      monthlyData[monthKey].count++;
      monthlyData[monthKey].students.add(record.student_id);
    });
    displayMonthlyRecords(monthlyData, year);
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

  const generateReportData = async (): Promise<GradeData[]> => {
    try {
      // Get all students
      const studentsResponse = await fetch('/api/students', { credentials: 'include' });
      const studentsData = await studentsResponse.json();
      const allStudents = studentsData.success ? studentsData.students : [];


      // Get all BMI records
      const bmiResponse = await fetch('/api/bmi-records', { credentials: 'include' });
      const bmiData = await bmiResponse.json();
      const allRecords = bmiData.success ? bmiData.records : [];


      // Get latest BMI record for each student
      const latestRecords: Record<number, any> = {};
      allRecords.forEach((record: any) => {
        if (!latestRecords[record.student_id] ||
          new Date(record.measured_at) > new Date(latestRecords[record.student_id].measured_at)) {
          latestRecords[record.student_id] = record;
        }
      });


      // Group students by grade level - map integer grade to string label
      const gradeMapping: Record<number, string> = {
        0: 'Kinder',
        1: 'Grade 1',
        2: 'Grade 2',
        3: 'Grade 3',
        4: 'Grade 4',
        5: 'Grade 5',
        6: 'Grade 6',
        7: 'SPED'
      };

      const gradeOrder = ['Kinder', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'SPED'];
      const gradeMap: Record<string, any[]> = {};
      
      allStudents.forEach((student: any) => {
        const gradeLabel = gradeMapping[student.grade_level] || `Grade ${student.grade_level}`;
        if (!gradeMap[gradeLabel]) {
          gradeMap[gradeLabel] = [];
        }
        gradeMap[gradeLabel].push(student);
      });


      const reportData: GradeData[] = [];

      gradeOrder.forEach((grade) => {
        const students = gradeMap[grade] || [];
        const maleStudents = students.filter((s: any) => s.gender === 'M' || s.gender === 'Male');
        const femaleStudents = students.filter((s: any) => s.gender === 'F' || s.gender === 'Female');

        const gradeData: GradeData = {
          gradeLevel: grade,
          enrollment: {
            M: maleStudents.length,
            F: femaleStudents.length,
            Total: students.length
          },
          bmi: {
            pupilsWeighed: { M: 0, F: 0, Total: 0 },
            severelyWasted: { M: 0, F: 0, Total: 0, percent: 0 },
            wasted: { M: 0, F: 0, Total: 0, percent: 0 },
            underweight: { M: 0, F: 0, Total: 0 },
            normal: { M: 0, F: 0, Total: 0, percent: 0 },
            overweight: { M: 0, F: 0, Total: 0, percent: 0 },
            obese: { M: 0, F: 0, Total: 0, percent: 0 },
            primaryBeneficiaries: { M: 0, F: 0, Total: 0 }
          },
          hfa: {
            pupilsTakenHeight: { M: 0, F: 0, Total: 0 },
            severelyStunted: { M: 0, F: 0, Total: 0, percent: 0 },
            stunted: { M: 0, F: 0, Total: 0, percent: 0 },
            severelyStuntedNotSW: { M: 0, F: 0, Total: 0 },
            stuntedNotSW: { M: 0, F: 0, Total: 0 },
            secondaryBeneficiaries: { M: 0, F: 0, Total: 0 },
            normal: { M: 0, F: 0, Total: 0, percent: 0 },
            tall: { M: 0, F: 0, Total: 0, percent: 0 }
          },
          totalBeneficiaries: { M: 0, F: 0, Total: 0 }
        };

        // Process each student in this grade
        students.forEach((student: any) => {
          const record = latestRecords[student.id];
          if (!record) {
            return;
          }


          // Map gender: "Male" -> 'M', "Female" -> 'F'
          const gender = student.gender;
          const sexKey = (gender === 'Male' || gender === 'M') ? 'M' : 'F';

          // Count pupils weighed/taken height
          gradeData.bmi.pupilsWeighed[sexKey]++;
          gradeData.bmi.pupilsWeighed.Total++;
          gradeData.hfa.pupilsTakenHeight[sexKey]++;
          gradeData.hfa.pupilsTakenHeight.Total++;

          // BMI Status
          if (record.bmi_status === 'Severely Wasted') {
            gradeData.bmi.severelyWasted[sexKey]++;
            gradeData.bmi.severelyWasted.Total++;
            gradeData.bmi.primaryBeneficiaries[sexKey]++;
            gradeData.bmi.primaryBeneficiaries.Total++;
          } else if (record.bmi_status === 'Wasted') {
            gradeData.bmi.wasted[sexKey]++;
            gradeData.bmi.wasted.Total++;
            gradeData.bmi.primaryBeneficiaries[sexKey]++;
            gradeData.bmi.primaryBeneficiaries.Total++;
          } else if (record.bmi_status === 'Underweight') {
            gradeData.bmi.underweight[sexKey]++;
            gradeData.bmi.underweight.Total++;
          } else if (record.bmi_status === 'Normal') {
            gradeData.bmi.normal[sexKey]++;
            gradeData.bmi.normal.Total++;
          } else if (record.bmi_status === 'Overweight') {
            gradeData.bmi.overweight[sexKey]++;
            gradeData.bmi.overweight.Total++;
          } else if (record.bmi_status === 'Obese') {
            gradeData.bmi.obese[sexKey]++;
            gradeData.bmi.obese.Total++;
          }

          // HFA Status
          const hasBadBMI = record.bmi_status === 'Severely Wasted' || record.bmi_status === 'Wasted';
          if (record.height_for_age_status === 'Severely Stunted') {
            gradeData.hfa.severelyStunted[sexKey]++;
            gradeData.hfa.severelyStunted.Total++;
            if (!hasBadBMI) {
              gradeData.hfa.severelyStuntedNotSW[sexKey]++;
              gradeData.hfa.severelyStuntedNotSW.Total++;
              gradeData.hfa.secondaryBeneficiaries[sexKey]++;
              gradeData.hfa.secondaryBeneficiaries.Total++;
            }
          } else if (record.height_for_age_status === 'Stunted') {
            gradeData.hfa.stunted[sexKey]++;
            gradeData.hfa.stunted.Total++;
            if (!hasBadBMI) {
              gradeData.hfa.stuntedNotSW[sexKey]++;
              gradeData.hfa.stuntedNotSW.Total++;
              gradeData.hfa.secondaryBeneficiaries[sexKey]++;
              gradeData.hfa.secondaryBeneficiaries.Total++;
            }
          } else if (record.height_for_age_status === 'Normal') {
            gradeData.hfa.normal[sexKey]++;
            gradeData.hfa.normal.Total++;
          } else if (record.height_for_age_status === 'Tall') {
            gradeData.hfa.tall[sexKey]++;
            gradeData.hfa.tall.Total++;
          }
        });

        // Calculate percentages
        if (gradeData.bmi.pupilsWeighed.Total > 0) {
          gradeData.bmi.severelyWasted.percent = (gradeData.bmi.severelyWasted.Total / gradeData.bmi.pupilsWeighed.Total) * 100;
          gradeData.bmi.wasted.percent = (gradeData.bmi.wasted.Total / gradeData.bmi.pupilsWeighed.Total) * 100;
          gradeData.bmi.normal.percent = (gradeData.bmi.normal.Total / gradeData.bmi.pupilsWeighed.Total) * 100;
          gradeData.bmi.overweight.percent = (gradeData.bmi.overweight.Total / gradeData.bmi.pupilsWeighed.Total) * 100;
          gradeData.bmi.obese.percent = (gradeData.bmi.obese.Total / gradeData.bmi.pupilsWeighed.Total) * 100;
        }

        if (gradeData.hfa.pupilsTakenHeight.Total > 0) {
          gradeData.hfa.severelyStunted.percent = (gradeData.hfa.severelyStunted.Total / gradeData.hfa.pupilsTakenHeight.Total) * 100;
          gradeData.hfa.stunted.percent = (gradeData.hfa.stunted.Total / gradeData.hfa.pupilsTakenHeight.Total) * 100;
          gradeData.hfa.normal.percent = (gradeData.hfa.normal.Total / gradeData.hfa.pupilsTakenHeight.Total) * 100;
          gradeData.hfa.tall.percent = (gradeData.hfa.tall.Total / gradeData.hfa.pupilsTakenHeight.Total) * 100;
        }

        // Total beneficiaries
        if (!gradeData.totalBeneficiaries) {
          gradeData.totalBeneficiaries = { M: 0, F: 0, Total: 0 };
        }
        gradeData.totalBeneficiaries.M = gradeData.bmi.primaryBeneficiaries.M + gradeData.hfa.secondaryBeneficiaries.M;
        gradeData.totalBeneficiaries.F = gradeData.bmi.primaryBeneficiaries.F + gradeData.hfa.secondaryBeneficiaries.F;
        gradeData.totalBeneficiaries.Total = gradeData.bmi.primaryBeneficiaries.Total + gradeData.hfa.secondaryBeneficiaries.Total;


        reportData.push(gradeData);
      });

      // Calculate grand total
      const grandTotal: GradeData = {
        gradeLevel: 'GRAND TOTAL',
        enrollment: { M: 0, F: 0, Total: 0 },
        bmi: {
          pupilsWeighed: { M: 0, F: 0, Total: 0 },
          severelyWasted: { M: 0, F: 0, Total: 0, percent: 0 },
          wasted: { M: 0, F: 0, Total: 0, percent: 0 },
          underweight: { M: 0, F: 0, Total: 0 },
          normal: { M: 0, F: 0, Total: 0, percent: 0 },
          overweight: { M: 0, F: 0, Total: 0, percent: 0 },
          obese: { M: 0, F: 0, Total: 0, percent: 0 },
          primaryBeneficiaries: { M: 0, F: 0, Total: 0 }
        },
        hfa: {
          pupilsTakenHeight: { M: 0, F: 0, Total: 0 },
          severelyStunted: { M: 0, F: 0, Total: 0, percent: 0 },
          stunted: { M: 0, F: 0, Total: 0, percent: 0 },
          severelyStuntedNotSW: { M: 0, F: 0, Total: 0 },
          stuntedNotSW: { M: 0, F: 0, Total: 0 },
          secondaryBeneficiaries: { M: 0, F: 0, Total: 0 },
          normal: { M: 0, F: 0, Total: 0, percent: 0 },
          tall: { M: 0, F: 0, Total: 0, percent: 0 }
        },
        totalBeneficiaries: { M: 0, F: 0, Total: 0 }
      };

      reportData.forEach((grade) => {
        grandTotal.enrollment.M += grade.enrollment.M;
        grandTotal.enrollment.F += grade.enrollment.F;
        grandTotal.enrollment.Total += grade.enrollment.Total;
        grandTotal.bmi.pupilsWeighed.M += grade.bmi.pupilsWeighed.M;
        grandTotal.bmi.pupilsWeighed.F += grade.bmi.pupilsWeighed.F;
        grandTotal.bmi.pupilsWeighed.Total += grade.bmi.pupilsWeighed.Total;
        grandTotal.bmi.severelyWasted.M += grade.bmi.severelyWasted.M;
        grandTotal.bmi.severelyWasted.F += grade.bmi.severelyWasted.F;
        grandTotal.bmi.severelyWasted.Total += grade.bmi.severelyWasted.Total;
        grandTotal.bmi.wasted.M += grade.bmi.wasted.M;
        grandTotal.bmi.wasted.F += grade.bmi.wasted.F;
        grandTotal.bmi.wasted.Total += grade.bmi.wasted.Total;
        grandTotal.bmi.underweight.M += grade.bmi.underweight.M;
        grandTotal.bmi.underweight.F += grade.bmi.underweight.F;
        grandTotal.bmi.underweight.Total += grade.bmi.underweight.Total;
        grandTotal.bmi.normal.M += grade.bmi.normal.M;
        grandTotal.bmi.normal.F += grade.bmi.normal.F;
        grandTotal.bmi.normal.Total += grade.bmi.normal.Total;
        grandTotal.bmi.overweight.M += grade.bmi.overweight.M;
        grandTotal.bmi.overweight.F += grade.bmi.overweight.F;
        grandTotal.bmi.overweight.Total += grade.bmi.overweight.Total;
        grandTotal.bmi.obese.M += grade.bmi.obese.M;
        grandTotal.bmi.obese.F += grade.bmi.obese.F;
        grandTotal.bmi.obese.Total += grade.bmi.obese.Total;
        grandTotal.bmi.primaryBeneficiaries.M += grade.bmi.primaryBeneficiaries.M;
        grandTotal.bmi.primaryBeneficiaries.F += grade.bmi.primaryBeneficiaries.F;
        grandTotal.bmi.primaryBeneficiaries.Total += grade.bmi.primaryBeneficiaries.Total;
        grandTotal.hfa.pupilsTakenHeight.M += grade.hfa.pupilsTakenHeight.M;
        grandTotal.hfa.pupilsTakenHeight.F += grade.hfa.pupilsTakenHeight.F;
        grandTotal.hfa.pupilsTakenHeight.Total += grade.hfa.pupilsTakenHeight.Total;
        grandTotal.hfa.severelyStunted.M += grade.hfa.severelyStunted.M;
        grandTotal.hfa.severelyStunted.F += grade.hfa.severelyStunted.F;
        grandTotal.hfa.severelyStunted.Total += grade.hfa.severelyStunted.Total;
        grandTotal.hfa.stunted.M += grade.hfa.stunted.M;
        grandTotal.hfa.stunted.F += grade.hfa.stunted.F;
        grandTotal.hfa.stunted.Total += grade.hfa.stunted.Total;
        grandTotal.hfa.severelyStuntedNotSW.M += grade.hfa.severelyStuntedNotSW.M;
        grandTotal.hfa.severelyStuntedNotSW.F += grade.hfa.severelyStuntedNotSW.F;
        grandTotal.hfa.severelyStuntedNotSW.Total += grade.hfa.severelyStuntedNotSW.Total;
        grandTotal.hfa.stuntedNotSW.M += grade.hfa.stuntedNotSW.M;
        grandTotal.hfa.stuntedNotSW.F += grade.hfa.stuntedNotSW.F;
        grandTotal.hfa.stuntedNotSW.Total += grade.hfa.stuntedNotSW.Total;
        grandTotal.hfa.secondaryBeneficiaries.M += grade.hfa.secondaryBeneficiaries.M;
        grandTotal.hfa.secondaryBeneficiaries.F += grade.hfa.secondaryBeneficiaries.F;
        grandTotal.hfa.secondaryBeneficiaries.Total += grade.hfa.secondaryBeneficiaries.Total;
        grandTotal.hfa.normal.M += grade.hfa.normal.M;
        grandTotal.hfa.normal.F += grade.hfa.normal.F;
        grandTotal.hfa.normal.Total += grade.hfa.normal.Total;
        grandTotal.hfa.tall.M += grade.hfa.tall.M;
        grandTotal.hfa.tall.F += grade.hfa.tall.F;
        grandTotal.hfa.tall.Total += grade.hfa.tall.Total;
        if (!grandTotal.totalBeneficiaries) {
          grandTotal.totalBeneficiaries = { M: 0, F: 0, Total: 0 };
        }
        if (grade.totalBeneficiaries) {
          grandTotal.totalBeneficiaries.M += grade.totalBeneficiaries.M;
          grandTotal.totalBeneficiaries.F += grade.totalBeneficiaries.F;
          grandTotal.totalBeneficiaries.Total += grade.totalBeneficiaries.Total;
        }
      });

      // Calculate grand total percentages
      if (grandTotal.bmi.pupilsWeighed.Total > 0) {
        grandTotal.bmi.severelyWasted.percent = (grandTotal.bmi.severelyWasted.Total / grandTotal.bmi.pupilsWeighed.Total) * 100;
        grandTotal.bmi.wasted.percent = (grandTotal.bmi.wasted.Total / grandTotal.bmi.pupilsWeighed.Total) * 100;
        grandTotal.bmi.normal.percent = (grandTotal.bmi.normal.Total / grandTotal.bmi.pupilsWeighed.Total) * 100;
        grandTotal.bmi.overweight.percent = (grandTotal.bmi.overweight.Total / grandTotal.bmi.pupilsWeighed.Total) * 100;
        grandTotal.bmi.obese.percent = (grandTotal.bmi.obese.Total / grandTotal.bmi.pupilsWeighed.Total) * 100;
      }

      if (grandTotal.hfa.pupilsTakenHeight.Total > 0) {
        grandTotal.hfa.severelyStunted.percent = (grandTotal.hfa.severelyStunted.Total / grandTotal.hfa.pupilsTakenHeight.Total) * 100;
        grandTotal.hfa.stunted.percent = (grandTotal.hfa.stunted.Total / grandTotal.hfa.pupilsTakenHeight.Total) * 100;
        grandTotal.hfa.normal.percent = (grandTotal.hfa.normal.Total / grandTotal.hfa.pupilsTakenHeight.Total) * 100;
        grandTotal.hfa.tall.percent = (grandTotal.hfa.tall.Total / grandTotal.hfa.pupilsTakenHeight.Total) * 100;
      }

      reportData.push(grandTotal);
      
      
      return reportData;
    } catch (error) {
      console.error('Error generating report data:', error);
      return [];
    }
  };

  const handleGenerateReport = async () => {
    setGenerating(true);
    const data = await generateReportData();
    setReportData(data);
    setShowReportModal(true);
    setGenerating(false);
  };

  const handleSaveReport = async (format: 'detailed' | 'simple') => {
    try {
      const title = format === 'detailed' 
        ? `BMI and HFA Report (Detailed) - ${new Date().toLocaleDateString()}`
        : `BMI and HFA Report (Simple) - ${new Date().toLocaleDateString()}`;

      const formData = new FormData();
      formData.append('action', 'generate');
      formData.append('title', title);
      formData.append('report_type', 'overview');
      formData.append('pdf_file', `overview:${format}`);
      formData.append('description', `Overview report generated on ${new Date().toLocaleString()}`);
      formData.append('data', JSON.stringify({
        format,
        reportData,
        generated_date: new Date().toISOString(),
        school_name: 'SCIENCE CITY OF MUNOZ',
        school_year: '2025-2026',
      }));

      const response = await fetch('/api/reports', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        alert('Report saved successfully! You can view it in the Reports section.');
        setShowReportModal(false);
      } else {
        alert('Failed to save report: ' + result.message);
      }
    } catch (error) {
      console.error('Error saving report:', error);
      alert('An error occurred while saving the report.');
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      <NutritionistSidebar approvedReportsCount={approvedReportsCount} />
      <main className="md:ml-64 min-h-screen bg-slate-50">
        {/* Page Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Overview</h1>
            <p className="text-xs text-slate-500 mt-0.5">KPI Summary — School Health Nutrition Program</p>
          </div>
        </div>

        <div className="p-5">
          {/* KPI Summary Cards */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-700"></div>
              <p className="mt-3 text-slate-500 text-sm">Loading data...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
              {/* BMI Status Card */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between" style={{ background: '#1a3a6c' }}>
                  <h2 className="text-sm font-bold text-white">Body Mass Index (BMI)</h2>
                  <div className="bg-white/20 rounded-full p-1.5 flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex justify-between items-center py-1.5 px-2 bg-slate-50 rounded-lg">
                    <span className="text-xs font-medium text-slate-600">Total Students</span>
                    <span className="text-sm font-bold text-slate-800">{dashboardData?.totalStudents || 0}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 px-2 bg-blue-50 rounded-lg">
                    <span className="text-xs font-medium text-blue-700">Pupils Weighed</span>
                    <span className="text-sm font-bold text-blue-700">{dashboardData?.pupilsWeighed || 0}</span>
                  </div>
                  <div className="border-t border-slate-100 pt-2 space-y-1.5">
                    <div className="flex justify-between items-center px-1">
                      <span className="text-xs text-slate-600">Severely Wasted</span>
                      <span className="badge status-severely-wasted">{dashboardData?.bmiCounts.severelyWasted || 0}</span>
                    </div>
                    <div className="flex justify-between items-center px-1">
                      <span className="text-xs text-slate-600">Wasted</span>
                      <span className="badge status-wasted">{dashboardData?.bmiCounts.wasted || 0}</span>
                    </div>
                    <div className="flex justify-between items-center px-1">
                      <span className="text-xs text-slate-600">Underweight</span>
                      <span className="badge status-underweight">{dashboardData?.bmiCounts.underweight || 0}</span>
                    </div>
                    <div className="flex justify-between items-center px-1">
                      <span className="text-xs text-slate-600">Normal</span>
                      <span className="badge status-normal">{dashboardData?.bmiCounts.normal || 0}</span>
                    </div>
                    <div className="flex justify-between items-center px-1">
                      <span className="text-xs text-slate-600">Overweight</span>
                      <span className="badge status-overweight">{dashboardData?.bmiCounts.overweight || 0}</span>
                    </div>
                    <div className="flex justify-between items-center px-1">
                      <span className="text-xs text-slate-600">Obese</span>
                      <span className="badge status-obese">{dashboardData?.bmiCounts.obese || 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Height For Age Card */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between" style={{ background: '#1a3a6c' }}>
                  <h2 className="text-sm font-bold text-white">Height For Age (HFA)</h2>
                  <div className="bg-white/20 rounded-full p-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex justify-between items-center py-1.5 px-2 bg-slate-50 rounded-lg">
                    <span className="text-xs font-medium text-slate-600">Total Students</span>
                    <span className="text-sm font-bold text-slate-800">{dashboardData?.totalStudents || 0}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 px-2 bg-green-50 rounded-lg">
                    <span className="text-xs font-medium text-green-700">Pupils Taken Height</span>
                    <span className="text-sm font-bold text-green-700">{dashboardData?.pupilsWeighed || 0}</span>
                  </div>
                  <div className="border-t border-slate-100 pt-2 space-y-1.5">
                    <div className="flex justify-between items-center px-1">
                      <span className="text-xs text-slate-600">Severely Stunted</span>
                      <span className="badge status-severely-stunted">{dashboardData?.hfaCounts.severelyStunted || 0}</span>
                    </div>
                    <div className="flex justify-between items-center px-1">
                      <span className="text-xs text-slate-600">Stunted</span>
                      <span className="badge status-stunted">{dashboardData?.hfaCounts.stunted || 0}</span>
                    </div>
                    <div className="flex justify-between items-center px-1">
                      <span className="text-xs text-slate-600">Normal</span>
                      <span className="badge status-normal">{dashboardData?.hfaCounts.normal || 0}</span>
                    </div>
                    <div className="flex justify-between items-center px-1">
                      <span className="text-xs text-slate-600">Tall</span>
                      <span className="badge status-tall">{dashboardData?.hfaCounts.tall || 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feeding Program Card */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between" style={{ background: '#1a3a6c' }}>
                  <h2 className="text-sm font-bold text-white">Feeding Program</h2>
                  <div className="bg-white/20 rounded-full p-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex justify-between items-center py-1.5 px-2 bg-slate-50 rounded-lg">
                    <span className="text-xs font-medium text-slate-600">Total Students</span>
                    <span className="text-sm font-bold text-slate-800">{dashboardData?.totalStudents || 0}</span>
                  </div>
                  <div className="border-t border-slate-100 pt-2 space-y-2">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-2.5">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-xs font-semibold text-red-800">Primary Beneficiaries</p>
                          <p className="text-xs text-red-500 mt-0.5">Severely Wasted / Wasted (current BMI)</p>
                        </div>
                        <span className="text-xl font-bold text-red-600">{dashboardData?.feedingProgram.primary || 0}</span>
                      </div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-xs font-semibold text-blue-800">Secondary Beneficiaries</p>
                          <p className="text-xs text-blue-500 mt-0.5">Stunted HFA, Normal BMI (current)</p>
                        </div>
                        <span className="text-xl font-bold text-blue-600">{dashboardData?.feedingProgram.secondary || 0}</span>
                      </div>
                    </div>
                    <div className="bg-green-50 border border-green-300 rounded-lg p-2.5">
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-bold text-green-800">Total Enrolled</p>
                        <span className="text-2xl font-bold text-green-600">{dashboardData?.feedingProgram.total || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Generate Report Button */}
          <div className="mb-5">
            <button
              onClick={handleGenerateReport}
              disabled={generating || loading}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              style={{ background: generating || loading ? '#64748b' : '#1a3a6c' }}
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Generating Report...</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Generate BMI &amp; HFA Report</span>
                </>
              )}
            </button>
          </div>

          {/* Report Preview Modal */}
          <Modal
            isOpen={showReportModal}
            onClose={() => setShowReportModal(false)}
            title="Report Preview"
            size="7xl"
          >
            <div className="space-y-6">
              {/* Format Selector */}
              <div className="flex justify-center gap-3 mb-4">
                <button
                  onClick={() => setReportFormat('detailed')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    reportFormat === 'detailed'
                      ? 'text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                  style={reportFormat === 'detailed' ? { background: '#1a3a6c' } : {}}
                >
                  Detailed Format (with %)
                </button>
                <button
                  onClick={() => setReportFormat('simple')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    reportFormat === 'simple'
                      ? 'text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                  style={reportFormat === 'simple' ? { background: '#1a3a6c' } : {}}
                >
                  Simple Format (counts only)
                </button>
              </div>

              {/* Report Header */}
              <div className="border-b pb-4">
                <div className="flex items-center justify-center gap-4">
                  {/* School Logo */}
                  <div className="flex-shrink-0">
                    <img 
                      src="/logo.png" 
                      alt="School Logo" 
                      className="w-20 h-20 object-contain"
                    />
                  </div>
                  
                  {/* Header Text */}
                  <div className="text-center">
                    <h3 className="text-sm font-semibold text-gray-600">Department of Education</h3>
                    <h3 className="text-sm font-semibold text-gray-600">Bureau of Learner Support Services</h3>
                    <h3 className="text-sm font-semibold text-gray-600">SCHOOL HEALTH DIVISION</h3>
                    <h3 className="text-lg font-bold text-gray-800 mt-2">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</h3>
                    <p className="text-sm text-blue-600 italic">Baseline SY 2025- 2026</p>
                  </div>
                </div>
              </div>

              {/* Report Content */}
              <div className="overflow-x-auto">
                {reportFormat === 'detailed' ? (
                  <DetailedReportTable data={reportData} />
                ) : (
                  <SimpleReportTable data={reportData} />
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-all font-medium"
                >
                  Close
                </button>
                <button
                  onClick={() => handleSaveReport(reportFormat)}
                  className="px-4 py-2 text-sm text-white rounded-lg transition-all font-medium shadow-sm"
                  style={{ background: '#1a3a6c' }}
                >
                  Save to Reports
                </button>
              </div>
            </div>
          </Modal>

          {/* Monthly Records */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between" style={{ background: '#1a3a6c' }}>
              <h2 className="text-sm font-bold text-white">Monthly BMI Records</h2>
              <div className="flex items-center gap-2">
                <label htmlFor="yearFilter" className="text-xs font-medium text-white/80">Year:</label>
                <select
                  id="yearFilter"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="px-2 py-1 text-xs border border-white/30 bg-white/10 text-white rounded focus:outline-none focus:ring-1 focus:ring-white/50"
                >
                  {populateYearFilter().map(year => (
                    <option key={year} value={year} className="text-slate-800 bg-white">{year}</option>
                  ))}
                </select>
              </div>
            </div>
            <div id="monthlyRecords" className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              <p className="col-span-full text-slate-400 text-center py-8 text-sm">Loading monthly records...</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Detailed Report Table Component (with percentages)
function DetailedReportTable({ data }: { data: GradeData[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border border-black text-xs">
        <thead>
          <tr className="bg-gray-100">
            <th rowSpan={3} className="border border-black px-2 py-2 text-center font-bold">Grade Level</th>
            <th rowSpan={3} className="border border-black px-2 py-2 text-center font-bold">Enrolment</th>
            <th colSpan={11} className="border border-black px-2 py-2 text-center font-bold bg-yellow-100">BODY MASS INDEX (BMI)</th>
            <th colSpan={9} className="border border-black px-2 py-2 text-center font-bold bg-blue-100">HEIGHT-FOR-AGE</th>
          </tr>
          <tr className="bg-gray-100">
            <th rowSpan={2} className="border border-black px-2 py-1 text-center text-[10px] font-semibold">Pupils Weighed</th>
            <th colSpan={2} className="border border-black px-2 py-1 text-center text-[10px] font-semibold bg-red-100">Severely Wasted</th>
            <th colSpan={2} className="border border-black px-2 py-1 text-center text-[10px] font-semibold bg-orange-100">Wasted<br/>Underweight*</th>
            <th colSpan={2} className="border border-black px-2 py-1 text-center text-[10px] font-semibold bg-green-100">Normal</th>
            <th colSpan={2} className="border border-black px-2 py-1 text-center text-[10px] font-semibold bg-purple-100">Overweight</th>
            <th colSpan={2} className="border border-black px-2 py-1 text-center text-[10px] font-semibold bg-pink-100">Obese</th>
            <th rowSpan={2} className="border border-black px-2 py-1 text-center text-[10px] font-semibold">Pupils Taken Height</th>
            <th colSpan={2} className="border border-black px-2 py-1 text-center text-[10px] font-semibold bg-red-100">Severely Stunted</th>
            <th colSpan={2} className="border border-black px-2 py-1 text-center text-[10px] font-semibold bg-orange-100">Stunted</th>
            <th colSpan={2} className="border border-black px-2 py-1 text-center text-[10px] font-semibold bg-green-100">Normal</th>
            <th colSpan={2} className="border border-black px-2 py-1 text-center text-[10px] font-semibold bg-blue-100">Tall</th>
          </tr>
          <tr className="bg-gray-100">
            <th className="border border-black px-1 py-1 text-[9px]">No.</th>
            <th className="border border-black px-1 py-1 text-[9px]">%</th>
            <th className="border border-black px-1 py-1 text-[9px]">No.</th>
            <th className="border border-black px-1 py-1 text-[9px]">%</th>
            <th className="border border-black px-1 py-1 text-[9px]">No.</th>
            <th className="border border-black px-1 py-1 text-[9px]">%</th>
            <th className="border border-black px-1 py-1 text-[9px]">No.</th>
            <th className="border border-black px-1 py-1 text-[9px]">%</th>
            <th className="border border-black px-1 py-1 text-[9px]">No.</th>
            <th className="border border-black px-1 py-1 text-[9px]">%</th>
            <th className="border border-black px-1 py-1 text-[9px]">No.</th>
            <th className="border border-black px-1 py-1 text-[9px]">%</th>
            <th className="border border-black px-1 py-1 text-[9px]">No.</th>
            <th className="border border-black px-1 py-1 text-[9px]">%</th>
            <th className="border border-black px-1 py-1 text-[9px]">No.</th>
            <th className="border border-black px-1 py-1 text-[9px]">%</th>
            <th className="border border-black px-1 py-1 text-[9px]">No.</th>
            <th className="border border-black px-1 py-1 text-[9px]">%</th>
          </tr>
        </thead>
        <tbody>
          {data.map((grade, index) => (
            <React.Fragment key={index}>
              {/* Male Row */}
              <tr className={grade.gradeLevel === 'GRAND TOTAL' ? 'bg-yellow-50 font-bold' : ''}>
                <td rowSpan={3} className="border border-black px-2 py-1 text-center font-semibold">{grade.gradeLevel}</td>
                <td className="border border-black px-2 py-1 text-center">M<br/>{grade.enrollment.M}</td>
                <td className="border border-black px-2 py-1 text-center">{grade.bmi.pupilsWeighed.M}</td>
                <td className="border border-black px-2 py-1 text-center">{grade.bmi.severelyWasted.M}</td>
                <td className="border border-black px-2 py-1 text-center">{grade.bmi.severelyWasted.M > 0 ? ((grade.bmi.severelyWasted.M / grade.bmi.pupilsWeighed.M) * 100).toFixed(2) + '%' : '0.00%'}</td>
                <td className="border border-black px-2 py-1 text-center">{grade.bmi.wasted.M}</td>
                <td className="border border-black px-2 py-1 text-center">{grade.bmi.wasted.M > 0 ? ((grade.bmi.wasted.M / grade.bmi.pupilsWeighed.M) * 100).toFixed(2) + '%' : '0.00%'}</td>
                <td className="border border-black px-2 py-1 text-center">{grade.bmi.normal.M}</td>
                <td className="border border-black px-2 py-1 text-center">{grade.bmi.normal.M > 0 ? ((grade.bmi.normal.M / grade.bmi.pupilsWeighed.M) * 100).toFixed(2) + '%' : '0.00%'}</td>
                <td className="border border-black px-2 py-1 text-center">{grade.bmi.overweight.M}</td>
                <td className="border border-black px-2 py-1 text-center">{grade.bmi.overweight.M > 0 ? ((grade.bmi.overweight.M / grade.bmi.pupilsWeighed.M) * 100).toFixed(2) + '%' : '0.00%'}</td>
                <td className="border border-black px-2 py-1 text-center">{grade.bmi.obese.M}</td>
                <td className="border border-black px-2 py-1 text-center">{grade.bmi.obese.M > 0 ? ((grade.bmi.obese.M / grade.bmi.pupilsWeighed.M) * 100).toFixed(2) + '%' : '0.00%'}</td>
                <td className="border border-black px-2 py-1 text-center">{grade.hfa.pupilsTakenHeight.M}</td>
                <td className="border border-black px-2 py-1 text-center">{grade.hfa.severelyStunted.M}</td>
                <td className="border border-black px-2 py-1 text-center">{grade.hfa.severelyStunted.M > 0 ? ((grade.hfa.severelyStunted.M / grade.hfa.pupilsTakenHeight.M) * 100).toFixed(2) + '%' : '0.00%'}</td>
                <td className="border border-black px-2 py-1 text-center">{grade.hfa.stunted.M}</td>
                <td className="border border-black px-2 py-1 text-center">{grade.hfa.stunted.M > 0 ? ((grade.hfa.stunted.M / grade.hfa.pupilsTakenHeight.M) * 100).toFixed(2) + '%' : '0.00%'}</td>
                <td className="border border-black px-2 py-1 text-center">{grade.hfa.normal.M}</td>
                <td className="border border-black px-2 py-1 text-center">{grade.hfa.normal.M > 0 ? ((grade.hfa.normal.M / grade.hfa.pupilsTakenHeight.M) * 100).toFixed(2) + '%' : '0.00%'}</td>
                <td className="border border-black px-2 py-1 text-center">{grade.hfa.tall.M}</td>
                <td className="border border-black px-2 py-1 text-center">{grade.hfa.tall.M > 0 ? ((grade.hfa.tall.M / grade.hfa.pupilsTakenHeight.M) * 100).toFixed(2) + '%' : '0.00%'}</td>
              </tr>
              {/* Female Row */}
              <tr className={grade.gradeLevel === 'GRAND TOTAL' ? 'bg-yellow-50 font-bold' : ''}>
                <td className="border border-black px-2 py-1 text-center">F<br/>{grade.enrollment.F}</td>
                <td className="border border-black px-2 py-1 text-center">{grade.bmi.pupilsWeighed.F}</td>
                <td className="border border-black px-2 py-1 text-center">{grade.bmi.severelyWasted.F}</td>
                <td className="border border-black px-2 py-1 text-center">{grade.bmi.severelyWasted.F > 0 ? ((grade.bmi.severelyWasted.F / grade.bmi.pupilsWeighed.F) * 100).toFixed(2) + '%' : '0.00%'}</td>
                <td className="border border-black px-2 py-1 text-center">{grade.bmi.wasted.F}</td>
                <td className="border border-black px-2 py-1 text-center">{grade.bmi.wasted.F > 0 ? ((grade.bmi.wasted.F / grade.bmi.pupilsWeighed.F) * 100).toFixed(2) + '%' : '0.00%'}</td>
                <td className="border border-black px-2 py-1 text-center">{grade.bmi.normal.F}</td>
                <td className="border border-black px-2 py-1 text-center">{grade.bmi.normal.F > 0 ? ((grade.bmi.normal.F / grade.bmi.pupilsWeighed.F) * 100).toFixed(2) + '%' : '0.00%'}</td>
                <td className="border border-black px-2 py-1 text-center">{grade.bmi.overweight.F}</td>
                <td className="border border-black px-2 py-1 text-center">{grade.bmi.overweight.F > 0 ? ((grade.bmi.overweight.F / grade.bmi.pupilsWeighed.F) * 100).toFixed(2) + '%' : '0.00%'}</td>
                <td className="border border-black px-2 py-1 text-center">{grade.bmi.obese.F}</td>
                <td className="border border-black px-2 py-1 text-center">{grade.bmi.obese.F > 0 ? ((grade.bmi.obese.F / grade.bmi.pupilsWeighed.F) * 100).toFixed(2) + '%' : '0.00%'}</td>
                <td className="border border-black px-2 py-1 text-center">{grade.hfa.pupilsTakenHeight.F}</td>
                <td className="border border-black px-2 py-1 text-center">{grade.hfa.severelyStunted.F}</td>
                <td className="border border-black px-2 py-1 text-center">{grade.hfa.severelyStunted.F > 0 ? ((grade.hfa.severelyStunted.F / grade.hfa.pupilsTakenHeight.F) * 100).toFixed(2) + '%' : '0.00%'}</td>
                <td className="border border-black px-2 py-1 text-center">{grade.hfa.stunted.F}</td>
                <td className="border border-black px-2 py-1 text-center">{grade.hfa.stunted.F > 0 ? ((grade.hfa.stunted.F / grade.hfa.pupilsTakenHeight.F) * 100).toFixed(2) + '%' : '0.00%'}</td>
                <td className="border border-black px-2 py-1 text-center">{grade.hfa.normal.F}</td>
                <td className="border border-black px-2 py-1 text-center">{grade.hfa.normal.F > 0 ? ((grade.hfa.normal.F / grade.hfa.pupilsTakenHeight.F) * 100).toFixed(2) + '%' : '0.00%'}</td>
                <td className="border border-black px-2 py-1 text-center">{grade.hfa.tall.F}</td>
                <td className="border border-black px-2 py-1 text-center">{grade.hfa.tall.F > 0 ? ((grade.hfa.tall.F / grade.hfa.pupilsTakenHeight.F) * 100).toFixed(2) + '%' : '0.00%'}</td>
              </tr>
              {/* Total Row */}
              <tr className={grade.gradeLevel === 'GRAND TOTAL' ? 'bg-yellow-100 font-bold' : 'bg-gray-50'}>
                <td className="border border-black px-2 py-1 text-center font-semibold">Total<br/>{grade.enrollment.Total}</td>
                <td className="border border-black px-2 py-1 text-center font-semibold">{grade.bmi.pupilsWeighed.Total}</td>
                <td className="border border-black px-2 py-1 text-center font-semibold">{grade.bmi.severelyWasted.Total}</td>
                <td className="border border-black px-2 py-1 text-center font-semibold text-red-600">{grade.bmi.severelyWasted.percent.toFixed(2)}%</td>
                <td className="border border-black px-2 py-1 text-center font-semibold">{grade.bmi.wasted.Total}</td>
                <td className="border border-black px-2 py-1 text-center font-semibold text-orange-600">{grade.bmi.wasted.percent.toFixed(2)}%</td>
                <td className="border border-black px-2 py-1 text-center font-semibold">{grade.bmi.normal.Total}</td>
                <td className="border border-black px-2 py-1 text-center font-semibold text-green-600">{grade.bmi.normal.percent.toFixed(2)}%</td>
                <td className="border border-black px-2 py-1 text-center font-semibold">{grade.bmi.overweight.Total}</td>
                <td className="border border-black px-2 py-1 text-center font-semibold text-purple-600">{grade.bmi.overweight.percent.toFixed(2)}%</td>
                <td className="border border-black px-2 py-1 text-center font-semibold">{grade.bmi.obese.Total}</td>
                <td className="border border-black px-2 py-1 text-center font-semibold text-pink-600">{grade.bmi.obese.percent.toFixed(2)}%</td>
                <td className="border border-black px-2 py-1 text-center font-semibold">{grade.hfa.pupilsTakenHeight.Total}</td>
                <td className="border border-black px-2 py-1 text-center font-semibold">{grade.hfa.severelyStunted.Total}</td>
                <td className="border border-black px-2 py-1 text-center font-semibold text-red-600">{grade.hfa.severelyStunted.percent.toFixed(2)}%</td>
                <td className="border border-black px-2 py-1 text-center font-semibold">{grade.hfa.stunted.Total}</td>
                <td className="border border-black px-2 py-1 text-center font-semibold text-orange-600">{grade.hfa.stunted.percent.toFixed(2)}%</td>
                <td className="border border-black px-2 py-1 text-center font-semibold">{grade.hfa.normal.Total}</td>
                <td className="border border-black px-2 py-1 text-center font-semibold text-green-600">{grade.hfa.normal.percent.toFixed(2)}%</td>
                <td className="border border-black px-2 py-1 text-center font-semibold">{grade.hfa.tall.Total}</td>
                <td className="border border-black px-2 py-1 text-center font-semibold text-blue-600">{grade.hfa.tall.percent.toFixed(2)}%</td>
              </tr>
            </React.Fragment>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-gray-600 mt-2 italic">* The number of learners who are Severely Wasted and Severely Underweight are combined in this column but different indices were used to determine them</p>
    </div>
  );
}

// Simple Report Table Component (counts only, no percentages)
function SimpleReportTable({ data }: { data: GradeData[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border border-black text-xs">
        <thead>
          <tr className="bg-gray-100">
            <th rowSpan={3} className="border border-black px-2 py-2 text-center font-bold">Grade Level</th>
            <th rowSpan={3} className="border border-black px-2 py-2 text-center font-bold">Enrolment</th>
            <th colSpan={4} className="border border-black px-2 py-2 text-center font-bold bg-yellow-100">BODY MASS INDEX (BMI)</th>
            <th colSpan={4} className="border border-black px-2 py-2 text-center font-bold bg-blue-100">HEIGHT FOR AGE (HFA)</th>
            <th rowSpan={3} className="border border-black px-2 py-2 text-center font-bold">TOTAL<br/>(Primary and Secondary)</th>
          </tr>
          <tr className="bg-gray-100">
            <th className="border border-black px-2 py-1 text-[10px] font-semibold">Pupils Weighed</th>
            <th className="border border-black px-2 py-1 text-[10px] font-semibold bg-red-100">Severely<br/>Underweight*</th>
            <th className="border border-black px-2 py-1 text-[10px] font-semibold bg-orange-100">Wasted<br/>Underweight</th>
            <th className="border border-black px-2 py-1 text-[10px] font-semibold bg-red-50">PRIMARY<br/>BENEFICIARIES</th>
            <th className="border border-black px-2 py-1 text-[10px] font-semibold">Pupils Taken Height</th>
            <th className="border border-black px-2 py-1 text-[10px] font-semibold bg-red-100">Severely Stunted<br/>not SW or W</th>
            <th className="border border-black px-2 py-1 text-[10px] font-semibold bg-orange-100">Stunted<br/>not SW or W</th>
            <th className="border border-black px-2 py-1 text-[10px] font-semibold bg-blue-50">SECONDARY<br/>BENEFICIARIES</th>
          </tr>
          <tr className="bg-gray-100">
            <th className="border border-black px-2 py-1 text-[10px] font-semibold">No.</th>
            <th className="border border-black px-2 py-1 text-[10px] font-semibold">No.</th>
            <th className="border border-black px-2 py-1 text-[10px] font-semibold">No.</th>
            <th className="border border-black px-2 py-1 text-[10px] font-semibold">No.</th>
            <th className="border border-black px-2 py-1 text-[10px] font-semibold">No.</th>
            <th className="border border-black px-2 py-1 text-[10px] font-semibold">No.</th>
            <th className="border border-black px-2 py-1 text-[10px] font-semibold">No.</th>
            <th className="border border-black px-2 py-1 text-[10px] font-semibold">No.</th>
          </tr>
        </thead>
        <tbody>
          {data.map((grade, index) => (
            <React.Fragment key={index}>
              {/* Male Row */}
              <tr className={grade.gradeLevel === 'GRAND TOTAL' ? 'bg-yellow-50 font-bold' : ''}>
                <td rowSpan={3} className="border border-black px-2 py-1 text-center font-semibold">{grade.gradeLevel}</td>
                <td className="border border-black px-2 py-1 text-center">M<br/>{grade.enrollment.M}</td>
                <td className="border border-black px-2 py-1 text-center">{grade.bmi.pupilsWeighed.M}</td>
                <td className="border border-black px-2 py-1 text-center">{grade.bmi.severelyWasted.M}</td>
                <td className="border border-black px-2 py-1 text-center">{grade.bmi.wasted.M}</td>
                <td className="border border-black px-2 py-1 text-center bg-red-50">{grade.bmi.primaryBeneficiaries.M}</td>
                <td className="border border-black px-2 py-1 text-center">{grade.hfa.pupilsTakenHeight.M}</td>
                <td className="border border-black px-2 py-1 text-center">{grade.hfa.severelyStuntedNotSW.M}</td>
                <td className="border border-black px-2 py-1 text-center">{grade.hfa.stuntedNotSW.M}</td>
                <td className="border border-black px-2 py-1 text-center bg-blue-50">{grade.hfa.secondaryBeneficiaries.M}</td>
                <td className="border border-black px-2 py-1 text-center font-semibold">
                  {((grade.bmi && grade.bmi.primaryBeneficiaries && grade.bmi.primaryBeneficiaries.M) || 0) + ((grade.hfa && grade.hfa.secondaryBeneficiaries && grade.hfa.secondaryBeneficiaries.M) || 0)}
                </td>
              </tr>
              {/* Female Row */}
              <tr className={grade.gradeLevel === 'GRAND TOTAL' ? 'bg-yellow-50 font-bold' : ''}>
                <td className="border border-black px-2 py-1 text-center">F<br/>{grade.enrollment.F}</td>
                <td className="border border-black px-2 py-1 text-center">{grade.bmi.pupilsWeighed.F}</td>
                <td className="border border-black px-2 py-1 text-center">{grade.bmi.severelyWasted.F}</td>
                <td className="border border-black px-2 py-1 text-center">{grade.bmi.wasted.F}</td>
                <td className="border border-black px-2 py-1 text-center bg-red-50">{grade.bmi.primaryBeneficiaries.F}</td>
                <td className="border border-black px-2 py-1 text-center">{grade.hfa.pupilsTakenHeight.F}</td>
                <td className="border border-black px-2 py-1 text-center">{grade.hfa.severelyStuntedNotSW.F}</td>
                <td className="border border-black px-2 py-1 text-center">{grade.hfa.stuntedNotSW.F}</td>
                <td className="border border-black px-2 py-1 text-center bg-blue-50">{grade.hfa.secondaryBeneficiaries.F}</td>
                <td className="border border-black px-2 py-1 text-center font-semibold">
                  {((grade.bmi && grade.bmi.primaryBeneficiaries && grade.bmi.primaryBeneficiaries.F) || 0) + ((grade.hfa && grade.hfa.secondaryBeneficiaries && grade.hfa.secondaryBeneficiaries.F) || 0)}
                </td>
              </tr>
              {/* Total Row */}
              <tr className={grade.gradeLevel === 'GRAND TOTAL' ? 'bg-yellow-100 font-bold' : 'bg-gray-50'}>
                <td className="border border-black px-2 py-1 text-center font-semibold">Total<br/>{grade.enrollment.Total}</td>
                <td className="border border-black px-2 py-1 text-center font-semibold">{grade.bmi.pupilsWeighed.Total}</td>
                <td className="border border-black px-2 py-1 text-center font-semibold text-red-600">{grade.bmi.severelyWasted.Total}</td>
                <td className="border border-black px-2 py-1 text-center font-semibold text-orange-600">{grade.bmi.wasted.Total}</td>
                <td className="border border-black px-2 py-1 text-center font-bold bg-red-100">{grade.bmi.primaryBeneficiaries.Total}</td>
                <td className="border border-black px-2 py-1 text-center font-semibold">{grade.hfa.pupilsTakenHeight.Total}</td>
                <td className="border border-black px-2 py-1 text-center font-semibold text-red-600">{grade.hfa.severelyStuntedNotSW.Total}</td>
                <td className="border border-black px-2 py-1 text-center font-semibold text-orange-600">{grade.hfa.stuntedNotSW.Total}</td>
                <td className="border border-black px-2 py-1 text-center font-bold bg-blue-100">{grade.hfa.secondaryBeneficiaries.Total}</td>
                <td className="border border-black px-2 py-1 text-center font-bold text-green-600">
                  {((grade.bmi && grade.bmi.primaryBeneficiaries && grade.bmi.primaryBeneficiaries.Total) || 0) + ((grade.hfa && grade.hfa.secondaryBeneficiaries && grade.hfa.secondaryBeneficiaries.Total) || 0)}
                </td>
              </tr>
            </React.Fragment>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-gray-600 mt-2 italic">* The number of learners who are Severely Wasted and Severely Underweight are combined in this column but different indices were used to determine them</p>
    </div>
  );
}
