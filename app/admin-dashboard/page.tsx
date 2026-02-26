'use client';

import { useEffect, useState } from 'react';
import React from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  generator_name?: string;
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

type ViewMode = 'overview' | 'approvals' | 'approved';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [currentApprovalsPage, setCurrentApprovalsPage] = useState(1);
  const [currentApprovedPage, setCurrentApprovedPage] = useState(1);
  const [approvalsTypeFilter, setApprovalsTypeFilter] = useState('');
  const [approvedTypeFilter, setApprovedTypeFilter] = useState('');
  const [approvedStatusFilter, setApprovedStatusFilter] = useState('');
  const itemsPerPage = 10;
  
  // Modal states for BMI/HFA report preview
  const [showOverviewModal, setShowOverviewModal] = useState(false);
  const [overviewReportData, setOverviewReportData] = useState<GradeData[]>([]);
  const [overviewFormat, setOverviewFormat] = useState<'detailed' | 'simple'>('detailed');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  
  // Modal state for PDF preview (feeding list, monthly BMI, etc.)
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfDataUrl, setPdfDataUrl] = useState<string>('');

  // Modal state for delete confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<Report | null>(null);

  // Modal state for reject confirmation
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [reportToReject, setReportToReject] = useState<Report | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState('');

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
        // Trigger event to notify nutritionist sidebar to update badge
        window.dispatchEvent(new CustomEvent('reportStatusUpdated'));
        console.log('[ADMIN] Report approved, notification event dispatched');
      } else {
        alert('Error: ' + (data.message || 'Failed to approve report'));
      }
    } catch (error) {
      console.error('Error approving report:', error);
      alert('An error occurred while approving the report');
    }
  };

  const openRejectModal = (report: Report) => {
    setReportToReject(report);
    setRejectionNotes('');
    setShowRejectModal(true);
  };

  const rejectReport = async () => {
    if (!reportToReject) return;
    
    if (!rejectionNotes.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('action', 'reject');
      formData.append('report_id', reportToReject.id.toString());
      formData.append('notes', rejectionNotes);

      const response = await fetch('/api/reports', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        alert('Report rejected successfully');
        setShowRejectModal(false);
        setReportToReject(null);
        setRejectionNotes('');
        loadDashboardData();
      } else {
        alert('Error: ' + (data.message || 'Failed to reject report'));
      }
    } catch (error) {
      console.error('Error rejecting report:', error);
      alert('An error occurred while rejecting the report');
    }
  };

  const deleteReport = async (id: number) => {
    try {
      const response = await fetch(`/api/reports?id=${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        alert('Report deleted successfully');
        setShowDeleteModal(false);
        setReportToDelete(null);
        loadDashboardData();
      } else {
        alert('Error: ' + (data.message || 'Failed to delete report'));
      }
    } catch (error) {
      console.error('Error deleting report:', error);
      alert('An error occurred while deleting the report');
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

  // View PDF reports (feeding list, monthly BMI, feeding program)
  const viewPdfReport = async (report: Report) => {
    try {
      console.log('[ADMIN] Viewing PDF report:', report.report_type, report.id);
      
      // Check if it's a feeding list (pre_post) report
      if (report.report_type === 'pre_post' && report.data) {
        const reportData = typeof report.data === 'string' ? JSON.parse(report.data) : report.data;
        const schoolName = reportData.school_name || 'SCIENCE CITY OF MUNOZ';
        const schoolYear = reportData.school_year || '2025-2026';
        
        const response = await fetch('/api/reports/generate-feeding-list', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            report_id: report.id,
            title: report.title,
            school_name: schoolName,
            school_year: schoolYear,
          }),
        });
        
        const data = await response.json();
        if (data.success && data.pdf_data) {
          setSelectedReport(report);
          (window as any).currentFeedingListPdfData = data.pdf_data;
          
          const { generateFeedingListPDF } = await import('@/components/FeedingListPdfGenerator');
          const doc = generateFeedingListPDF(data.pdf_data);
          const pdfBlob = doc.output('blob');
          const pdfUrl = URL.createObjectURL(pdfBlob);
          setPdfDataUrl(pdfUrl);
          setShowPdfModal(true);
          return;
        } else {
          alert(`Error generating PDF: ${data.message || 'Unknown error'}`);
          return;
        }
      }
      
      // Check if it's a monthly BMI report
      if (report.report_type === 'monthly_bmi' && report.data) {
        const reportData = typeof report.data === 'string' ? JSON.parse(report.data) : report.data;
        const gradeLevel = reportData.grade_level;
        const reportMonth = reportData.report_month;
        const schoolName = reportData.school_name || 'SCIENCE CITY OF MUNOZ';
        const schoolYear = reportData.school_year || '2025-2026';
        
        if (!gradeLevel || !reportMonth) {
          alert('Report data is incomplete. Missing grade level or report month.');
          return;
        }

        const response = await fetch('/api/reports/generate-pdf', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            report_id: report.id,
            grade_level: gradeLevel,
            report_month: reportMonth,
            school_name: schoolName,
            school_year: schoolYear,
          }),
        });
        
        const data = await response.json();
        if (data.success && data.pdf_data) {
          setSelectedReport(report);
          (window as any).currentPdfData = data.pdf_data;
          
          const { generatePDF } = await import('@/components/PdfGenerator');
          const doc = generatePDF(data.pdf_data);
          const pdfBlob = doc.output('blob');
          const pdfUrl = URL.createObjectURL(pdfBlob);
          setPdfDataUrl(pdfUrl);
          setShowPdfModal(true);
          return;
        } else {
          alert(`Error generating PDF: ${data.message || 'Unknown error'}`);
          return;
        }
      }
      
      alert('This report type is not supported for preview.');
    } catch (error: any) {
      console.error('[ADMIN] Error viewing PDF report:', error);
      alert(`Error viewing report: ${error.message || 'Unknown error'}`);
    }
  };
  
  // Route to correct view function based on report type
  const viewReport = (report: Report) => {
    if (report.report_type === 'overview') {
      viewOverviewReport(report);
    } else {
      viewPdfReport(report);
    }
  };

  const viewOverviewReport = async (report: Report) => {
    try {
      console.log('[ADMIN] Opening report:', report.id, report.title);
      
      // First, fetch the full report details from the API to get complete data
      const reportResponse = await fetch(`/api/reports?id=${report.id}`, { credentials: 'include' });
      const reportResult = await reportResponse.json();
      
      let fullReport = report;
      if (reportResult.success && reportResult.report) {
        fullReport = reportResult.report;
        console.log('[ADMIN] Fetched full report data:', fullReport);
      } else {
        console.log('[ADMIN] Could not fetch full report, using dashboard data');
      }
      
      // Determine format from pdf_file or data.format, default to 'detailed'
      let format: 'detailed' | 'simple' = 'detailed';
      
      if (fullReport.pdf_file?.startsWith('overview:')) {
        format = fullReport.pdf_file.split(':')[1] as 'detailed' | 'simple';
      } else if (fullReport.data) {
        const reportData = typeof fullReport.data === 'string' ? JSON.parse(fullReport.data) : fullReport.data;
        format = reportData.format || 'detailed';
      }
      
      // Parse report data if it exists
      let reportData = null;
      if (fullReport.data) {
        reportData = typeof fullReport.data === 'string' ? JSON.parse(fullReport.data) : fullReport.data;
        console.log('[ADMIN] Parsed report data:', reportData);
        console.log('[ADMIN] Has reportData field?', !!reportData.reportData);
        console.log('[ADMIN] Is array?', Array.isArray(reportData.reportData));
        console.log('[ADMIN] Array length?', reportData.reportData?.length);
      }
      
      // Check if we have valid report data
      const hasValidData = reportData && 
                          reportData.reportData && 
                          Array.isArray(reportData.reportData) && 
                          reportData.reportData.length > 0;
      
      console.log('[ADMIN] Has valid data?', hasValidData);
      
      // If reportData doesn't exist or is invalid, try to regenerate it
      if (!hasValidData) {
        console.log('[ADMIN] Report data missing or invalid, regenerating...');
        
        try {
          // Fetch all students and BMI records to regenerate the report
          const studentsResponse = await fetch('/api/students', { credentials: 'include' });
          const studentsData = await studentsResponse.json();
          
          if (!studentsResponse.ok || !studentsData.success) {
            console.error('[ADMIN] Failed to fetch students:', studentsResponse.status, studentsData);
            alert('Unable to regenerate report data. You may not have permission to access student records.');
            return;
          }
          
          const allStudents = studentsData.students || [];

          const bmiResponse = await fetch('/api/bmi-records', { credentials: 'include' });
          const bmiData = await bmiResponse.json();
          
          if (!bmiResponse.ok || !bmiData.success) {
            console.error('[ADMIN] Failed to fetch BMI records:', bmiResponse.status, bmiData);
            alert('Unable to regenerate report data. You may not have permission to access BMI records.');
            return;
          }
          
          const allRecords = bmiData.records || [];

          // Get latest BMI record for each student
          const latestRecords: Record<number, any> = {};
          allRecords.forEach((record: any) => {
            if (!latestRecords[record.student_id] ||
              new Date(record.measured_at) > new Date(latestRecords[record.student_id].measured_at)) {
              latestRecords[record.student_id] = record;
            }
          });

          // Generate report data using the same logic as nutritionist-overview
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

          const generatedReportData: GradeData[] = [];

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
              if (!record) return;

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
            gradeData.totalBeneficiaries!.M = gradeData.bmi.primaryBeneficiaries.M + gradeData.hfa.secondaryBeneficiaries.M;
            gradeData.totalBeneficiaries!.F = gradeData.bmi.primaryBeneficiaries.F + gradeData.hfa.secondaryBeneficiaries.F;
            gradeData.totalBeneficiaries!.Total = gradeData.bmi.primaryBeneficiaries.Total + gradeData.hfa.secondaryBeneficiaries.Total;

            generatedReportData.push(gradeData);
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

          generatedReportData.forEach((grade) => {
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
            grandTotal.totalBeneficiaries!.M += grade.totalBeneficiaries!.M;
            grandTotal.totalBeneficiaries!.F += grade.totalBeneficiaries!.F;
            grandTotal.totalBeneficiaries!.Total += grade.totalBeneficiaries!.Total;
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

          generatedReportData.push(grandTotal);

          console.log('[ADMIN] Successfully regenerated report data with', generatedReportData.length, 'grades');
          setOverviewReportData(generatedReportData);
          setOverviewFormat(format);
          await downloadOverviewReportPdf(fullReport, true);
          return;
        } catch (regenerateError) {
          console.error('[ADMIN] Error regenerating report data:', regenerateError);
          alert('Unable to load report data. Please regenerate the report from the Overview page.');
          return;
        }
      }
      
      // Recalculate totalBeneficiaries for each grade (in case it's missing from old reports)
      const updatedReportData = reportData.reportData.map((grade: GradeData) => {
        const primaryM = (grade.bmi && grade.bmi.primaryBeneficiaries && grade.bmi.primaryBeneficiaries.M) || 0;
        const primaryF = (grade.bmi && grade.bmi.primaryBeneficiaries && grade.bmi.primaryBeneficiaries.F) || 0;
        const primaryTotal = (grade.bmi && grade.bmi.primaryBeneficiaries && grade.bmi.primaryBeneficiaries.Total) || 0;
        const secondaryM = (grade.hfa && grade.hfa.secondaryBeneficiaries && grade.hfa.secondaryBeneficiaries.M) || 0;
        const secondaryF = (grade.hfa && grade.hfa.secondaryBeneficiaries && grade.hfa.secondaryBeneficiaries.F) || 0;
        const secondaryTotal = (grade.hfa && grade.hfa.secondaryBeneficiaries && grade.hfa.secondaryBeneficiaries.Total) || 0;
        
        return {
          ...grade,
          totalBeneficiaries: {
            M: primaryM + secondaryM,
            F: primaryF + secondaryF,
            Total: primaryTotal + secondaryTotal
          }
        };
      });
      
      console.log('[ADMIN] Using existing report data with', updatedReportData.length, 'grades');
      setOverviewReportData(updatedReportData);
      setOverviewFormat(format);
      await downloadOverviewReportPdf(fullReport, true);
    } catch (error: any) {
      console.error('Error loading overview report:', error);
      alert(`Error loading report: ${error.message || 'Unknown error'}`);
    }
  };

  const downloadOverviewReportPdf = async (report: Report, preview = false) => {
    try {
      console.log('[ADMIN] Downloading PDF for report:', report.id);
      
      // Fetch the full report to ensure we have complete data
      const reportResponse = await fetch(`/api/reports?id=${report.id}`, { credentials: 'include' });
      const reportResult = await reportResponse.json();
      
      let fullReport = report;
      if (reportResult.success && reportResult.report) {
        fullReport = reportResult.report;
        console.log('[ADMIN] Fetched full report for download');
      }
      
      // Parse report data if it exists
      let reportData = null;
      if (fullReport.data) {
        reportData = typeof fullReport.data === 'string' ? JSON.parse(fullReport.data) : fullReport.data;
      }
      
      // Check if we have valid report data
      const hasValidData = reportData && 
                          reportData.reportData && 
                          Array.isArray(reportData.reportData) && 
                          reportData.reportData.length > 0;
      
      console.log('[ADMIN] Has valid data for PDF?', hasValidData);
      
      if (!hasValidData) {
        // If data is missing, use the data from overviewReportData state if modal was opened
        if (overviewReportData.length > 0) {
          console.log('[ADMIN] Using data from modal state');
          reportData = {
            reportData: overviewReportData,
            format: overviewFormat,
            generated_date: new Date().toISOString(),
            school_name: 'SCIENCE CITY OF MUNOZ',
            school_year: '2025-2026',
          };
        } else {
          alert('Report data not found. Please view the report first, then download.');
          return;
        }
      }

      // Recalculate totalBeneficiaries for each grade
      const data = reportData.reportData.map((grade: GradeData) => {
        const primaryM = (grade.bmi && grade.bmi.primaryBeneficiaries && grade.bmi.primaryBeneficiaries.M) || 0;
        const primaryF = (grade.bmi && grade.bmi.primaryBeneficiaries && grade.bmi.primaryBeneficiaries.F) || 0;
        const primaryTotal = (grade.bmi && grade.bmi.primaryBeneficiaries && grade.bmi.primaryBeneficiaries.Total) || 0;
        const secondaryM = (grade.hfa && grade.hfa.secondaryBeneficiaries && grade.hfa.secondaryBeneficiaries.M) || 0;
        const secondaryF = (grade.hfa && grade.hfa.secondaryBeneficiaries && grade.hfa.secondaryBeneficiaries.F) || 0;
        const secondaryTotal = (grade.hfa && grade.hfa.secondaryBeneficiaries && grade.hfa.secondaryBeneficiaries.Total) || 0;
        
        return {
          ...grade,
          totalBeneficiaries: {
            M: primaryM + secondaryM,
            F: primaryF + secondaryF,
            Total: primaryTotal + secondaryTotal
          }
        };
      });
      
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'legal'
      });

      // Helper function to add logo
      const addLogo = (yPos: number) => {
        try {
          const img = new Image();
          img.src = '/logo.png';
          doc.addImage(img, 'PNG', 14, yPos, 20, 20);
        } catch (error) {
          console.log('Logo not available');
        }
      };

      // Page 1: Detailed Report
      addLogo(10);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Department of Education', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
      doc.text('Bureau of Learner Support Services', doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
      doc.text('SCHOOL HEALTH DIVISION', doc.internal.pageSize.getWidth() / 2, 25, { align: 'center' });
      doc.setFontSize(12);
      const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      doc.text(currentDate, doc.internal.pageSize.getWidth() / 2, 30, { align: 'center' });
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text('Baseline SY 2025-2026', doc.internal.pageSize.getWidth() / 2, 35, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('BMI and HFA Report (Detailed)', doc.internal.pageSize.getWidth() / 2, 40, { align: 'center' });

      // Build detailed table data
      const detailedHeaders = [
        [{ content: 'Grade Level', rowSpan: 3 }, { content: 'Enrolment', rowSpan: 3 }, 
         { content: 'BODY MASS INDEX (BMI)', colSpan: 11 }, 
         { content: 'HEIGHT-FOR-AGE', colSpan: 9 }]
      ];

      const detailedSubHeaders = [
        ['Pupils Weighed', 'Severely Wasted', '', 'Wasted\nUnderweight*', '', 'Normal', '', 'Overweight', '', 'Obese', '',
         'Pupils Taken Height', 'Severely Stunted', '', 'Stunted', '', 'Normal', '', 'Tall', '']
      ];

      const detailedColHeaders = [
        ['', 'No.', '%', 'No.', '%', 'No.', '%', 'No.', '%', 'No.', '%',
         '', 'No.', '%', 'No.', '%', 'No.', '%', 'No.', '%']
      ];

      const detailedRows: any[] = [];
      data.forEach((grade: GradeData) => {
        // Male row
        detailedRows.push([
          { content: grade.gradeLevel, rowSpan: 3 },
          `M\n${grade.enrollment.M}`,
          grade.bmi.pupilsWeighed.M,
          grade.bmi.severelyWasted.M,
          grade.bmi.severelyWasted.M > 0 ? ((grade.bmi.severelyWasted.M / grade.bmi.pupilsWeighed.M) * 100).toFixed(2) + '%' : '0.00%',
          grade.bmi.wasted.M,
          grade.bmi.wasted.M > 0 ? ((grade.bmi.wasted.M / grade.bmi.pupilsWeighed.M) * 100).toFixed(2) + '%' : '0.00%',
          grade.bmi.normal.M,
          grade.bmi.normal.M > 0 ? ((grade.bmi.normal.M / grade.bmi.pupilsWeighed.M) * 100).toFixed(2) + '%' : '0.00%',
          grade.bmi.overweight.M,
          grade.bmi.overweight.M > 0 ? ((grade.bmi.overweight.M / grade.bmi.pupilsWeighed.M) * 100).toFixed(2) + '%' : '0.00%',
          grade.bmi.obese.M,
          grade.bmi.obese.M > 0 ? ((grade.bmi.obese.M / grade.bmi.pupilsWeighed.M) * 100).toFixed(2) + '%' : '0.00%',
          grade.hfa.pupilsTakenHeight.M,
          grade.hfa.severelyStunted.M,
          grade.hfa.severelyStunted.M > 0 ? ((grade.hfa.severelyStunted.M / grade.hfa.pupilsTakenHeight.M) * 100).toFixed(2) + '%' : '0.00%',
          grade.hfa.stunted.M,
          grade.hfa.stunted.M > 0 ? ((grade.hfa.stunted.M / grade.hfa.pupilsTakenHeight.M) * 100).toFixed(2) + '%' : '0.00%',
          grade.hfa.normal.M,
          grade.hfa.normal.M > 0 ? ((grade.hfa.normal.M / grade.hfa.pupilsTakenHeight.M) * 100).toFixed(2) + '%' : '0.00%',
          grade.hfa.tall.M,
          grade.hfa.tall.M > 0 ? ((grade.hfa.tall.M / grade.hfa.pupilsTakenHeight.M) * 100).toFixed(2) + '%' : '0.00%'
        ]);
        // Female row
        detailedRows.push([
          `F\n${grade.enrollment.F}`,
          grade.bmi.pupilsWeighed.F,
          grade.bmi.severelyWasted.F,
          grade.bmi.severelyWasted.F > 0 ? ((grade.bmi.severelyWasted.F / grade.bmi.pupilsWeighed.F) * 100).toFixed(2) + '%' : '0.00%',
          grade.bmi.wasted.F,
          grade.bmi.wasted.F > 0 ? ((grade.bmi.wasted.F / grade.bmi.pupilsWeighed.F) * 100).toFixed(2) + '%' : '0.00%',
          grade.bmi.normal.F,
          grade.bmi.normal.F > 0 ? ((grade.bmi.normal.F / grade.bmi.pupilsWeighed.F) * 100).toFixed(2) + '%' : '0.00%',
          grade.bmi.overweight.F,
          grade.bmi.overweight.F > 0 ? ((grade.bmi.overweight.F / grade.bmi.pupilsWeighed.F) * 100).toFixed(2) + '%' : '0.00%',
          grade.bmi.obese.F,
          grade.bmi.obese.F > 0 ? ((grade.bmi.obese.F / grade.bmi.pupilsWeighed.F) * 100).toFixed(2) + '%' : '0.00%',
          grade.hfa.pupilsTakenHeight.F,
          grade.hfa.severelyStunted.F,
          grade.hfa.severelyStunted.F > 0 ? ((grade.hfa.severelyStunted.F / grade.hfa.pupilsTakenHeight.F) * 100).toFixed(2) + '%' : '0.00%',
          grade.hfa.stunted.F,
          grade.hfa.stunted.F > 0 ? ((grade.hfa.stunted.F / grade.hfa.pupilsTakenHeight.F) * 100).toFixed(2) + '%' : '0.00%',
          grade.hfa.normal.F,
          grade.hfa.normal.F > 0 ? ((grade.hfa.normal.F / grade.hfa.pupilsTakenHeight.F) * 100).toFixed(2) + '%' : '0.00%',
          grade.hfa.tall.F,
          grade.hfa.tall.F > 0 ? ((grade.hfa.tall.F / grade.hfa.pupilsTakenHeight.F) * 100).toFixed(2) + '%' : '0.00%'
        ]);
        // Total row
        detailedRows.push([
          `Total\n${grade.enrollment.Total}`,
          grade.bmi.pupilsWeighed.Total,
          grade.bmi.severelyWasted.Total,
          grade.bmi.severelyWasted.percent.toFixed(2) + '%',
          grade.bmi.wasted.Total,
          grade.bmi.wasted.percent.toFixed(2) + '%',
          grade.bmi.normal.Total,
          grade.bmi.normal.percent.toFixed(2) + '%',
          grade.bmi.overweight.Total,
          grade.bmi.overweight.percent.toFixed(2) + '%',
          grade.bmi.obese.Total,
          grade.bmi.obese.percent.toFixed(2) + '%',
          grade.hfa.pupilsTakenHeight.Total,
          grade.hfa.severelyStunted.Total,
          grade.hfa.severelyStunted.percent.toFixed(2) + '%',
          grade.hfa.stunted.Total,
          grade.hfa.stunted.percent.toFixed(2) + '%',
          grade.hfa.normal.Total,
          grade.hfa.normal.percent.toFixed(2) + '%',
          grade.hfa.tall.Total,
          grade.hfa.tall.percent.toFixed(2) + '%'
        ]);
      });

      autoTable(doc, {
        head: [...detailedHeaders, ...detailedSubHeaders, ...detailedColHeaders],
        body: detailedRows,
        startY: 45,
        theme: 'grid',
        styles: { 
          fontSize: 5.5, 
          cellPadding: 0.8, 
          halign: 'center', 
          valign: 'middle',
          textColor: [0, 0, 0],
          lineColor: [0, 0, 0],
          lineWidth: 0.1
        },
        headStyles: { 
          fillColor: [220, 220, 220], 
          textColor: [0, 0, 0],
          fontStyle: 'bold', 
          fontSize: 5.5,
          cellPadding: 0.8,
          lineColor: [0, 0, 0],
          lineWidth: 0.1
        },
        margin: { left: 5, right: 5 },
        tableWidth: 'auto'
      });

      doc.setFontSize(7);
      doc.text('* The number of learners who are Severely Wasted and Severely Underweight are combined in this column but different indices were used to determine them', 14, (doc as any).lastAutoTable.finalY + 5);

      // Page 2: Simple Report
      doc.addPage();
      addLogo(10);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Department of Education', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
      doc.text('Bureau of Learner Support Services', doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
      doc.text('SCHOOL HEALTH DIVISION', doc.internal.pageSize.getWidth() / 2, 25, { align: 'center' });
      doc.setFontSize(12);
      doc.text(currentDate, doc.internal.pageSize.getWidth() / 2, 30, { align: 'center' });
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text('Baseline SY 2025-2026', doc.internal.pageSize.getWidth() / 2, 35, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('BMI and HFA Report (Simple)', doc.internal.pageSize.getWidth() / 2, 40, { align: 'center' });

      // Build simple table (only counts, no percentages)
      const simpleHeaders = [
        [{ content: 'Grade Level', rowSpan: 3 }, { content: 'Enrolment', rowSpan: 3 }, 
         { content: 'BODY MASS INDEX (BMI)', colSpan: 8 }, 
         { content: 'HEIGHT-FOR-AGE', colSpan: 6 },
         { content: 'TOTAL', rowSpan: 3 }]
      ];

      const simpleSubHeaders = [
        ['', '', 'Severely Wasted', '', 'Wasted', '', 'PRIMARY', '', 'Severely Stunted', '', 'Stunted', '', 'SECONDARY', '', '']
      ];

      const simpleColHeaders = [
        ['', '', 'No.', 'No.', 'No.', 'No.', 'No.', 'No.', 'No.', 'No.', 'No.', 'No.', 'No.', 'No.', 'No.']
      ];

      const simpleRows: any[] = [];
      data.forEach((grade: GradeData) => {
        // Male row
        simpleRows.push([
          { content: grade.gradeLevel, rowSpan: 3 },
          `M\n${grade.enrollment.M}`,
          grade.bmi.pupilsWeighed.M,
          grade.bmi.severelyWasted.M,
          grade.bmi.pupilsWeighed.M,
          grade.bmi.wasted.M,
          grade.bmi.pupilsWeighed.M,
          grade.bmi.primaryBeneficiaries.M,
          grade.hfa.pupilsTakenHeight.M,
          grade.hfa.severelyStunted.M,
          grade.hfa.pupilsTakenHeight.M,
          grade.hfa.stunted.M,
          grade.hfa.pupilsTakenHeight.M,
          grade.hfa.secondaryBeneficiaries.M,
          grade.totalBeneficiaries!.M
        ]);
        // Female row
        simpleRows.push([
          `F\n${grade.enrollment.F}`,
          grade.bmi.pupilsWeighed.F,
          grade.bmi.severelyWasted.F,
          grade.bmi.pupilsWeighed.F,
          grade.bmi.wasted.F,
          grade.bmi.pupilsWeighed.F,
          grade.bmi.primaryBeneficiaries.F,
          grade.hfa.pupilsTakenHeight.F,
          grade.hfa.severelyStunted.F,
          grade.hfa.pupilsTakenHeight.F,
          grade.hfa.stunted.F,
          grade.hfa.pupilsTakenHeight.F,
          grade.hfa.secondaryBeneficiaries.F,
          grade.totalBeneficiaries!.F
        ]);
        // Total row
        simpleRows.push([
          `Total\n${grade.enrollment.Total}`,
          grade.bmi.pupilsWeighed.Total,
          grade.bmi.severelyWasted.Total,
          grade.bmi.pupilsWeighed.Total,
          grade.bmi.wasted.Total,
          grade.bmi.pupilsWeighed.Total,
          grade.bmi.primaryBeneficiaries.Total,
          grade.hfa.pupilsTakenHeight.Total,
          grade.hfa.severelyStunted.Total,
          grade.hfa.pupilsTakenHeight.Total,
          grade.hfa.stunted.Total,
          grade.hfa.pupilsTakenHeight.Total,
          grade.hfa.secondaryBeneficiaries.Total,
          grade.totalBeneficiaries!.Total
        ]);
      });

      autoTable(doc, {
        head: [...simpleHeaders, ...simpleSubHeaders, ...simpleColHeaders],
        body: simpleRows,
        startY: 45,
        theme: 'grid',
        styles: { 
          fontSize: 6.5, 
          cellPadding: 1, 
          halign: 'center', 
          valign: 'middle',
          textColor: [0, 0, 0],
          lineColor: [0, 0, 0],
          lineWidth: 0.1
        },
        headStyles: { 
          fillColor: [220, 220, 220], 
          textColor: [0, 0, 0],
          fontStyle: 'bold', 
          fontSize: 6.5,
          cellPadding: 1,
          lineColor: [0, 0, 0],
          lineWidth: 0.1
        },
        margin: { left: 5, right: 5 },
        tableWidth: 'auto'
      });

      // Prepared by section (after simple table)
      const preparedByName = fullReport.generator_name || 'Nutritionist';
      const preparedByY = (doc as any).lastAutoTable.finalY + 12;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Prepared by:', doc.internal.pageSize.getWidth() - 80, preparedByY);
      doc.setFont('helvetica', 'bold');
      doc.text(preparedByName, doc.internal.pageSize.getWidth() - 80, preparedByY + 8);
      doc.setFont('helvetica', 'normal');
      doc.text('Nutritionist', doc.internal.pageSize.getWidth() - 80, preparedByY + 14);

      // Save or preview the PDF
      if (preview) {
        const pdfBlob = doc.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        setPdfDataUrl(pdfUrl);
        setSelectedReport(fullReport);
        setShowPdfModal(true);
      } else {
        doc.save(`${fullReport.title.replace(/[^a-z0-9]/gi, '_')}_combined.pdf`);
      }
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      alert(`Error generating PDF: ${error.message || 'Unknown error'}`);
    }
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

  const formatReportType = (type: string) => {
    const types: Record<string, string> = {
      monthly_bmi: 'Monthly BMI',
      pre_post: 'List for Feeding',
      overview: 'BMI and HFA Report',
    };
    return types[type] || type.replace('_', ' ');
  };

  // Filter reports by type
  const allPendingReports = dashboardData.pending_reports_list || [];
  const allApprovedReports = dashboardData.approved_reports_list || [];

  const pendingReports = approvalsTypeFilter
    ? allPendingReports.filter((report: Report) => report.report_type === approvalsTypeFilter)
    : allPendingReports;

  let approvedReports = allApprovedReports;
  if (approvedTypeFilter) {
    approvedReports = approvedReports.filter((report: Report) => report.report_type === approvedTypeFilter);
  }
  if (approvedStatusFilter) {
    approvedReports = approvedReports.filter((report: Report) => report.status === approvedStatusFilter);
  }

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
      <AdminSidebar pendingReportsCount={dashboardData?.pending_reports || 0} />
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
                
                {/* Type Filter */}
                <div className="mb-4">
                  <select
                    value={approvalsTypeFilter}
                    onChange={(e) => {
                      setApprovalsTypeFilter(e.target.value);
                      setCurrentApprovalsPage(1);
                    }}
                    className="px-4 py-2 border rounded-lg"
                  >
                    <option value="">All Types</option>
                    <option value="monthly_bmi">Monthly BMI</option>
                    <option value="pre_post">List for Feeding</option>
                    <option value="overview">BMI and HFA Report</option>
                  </select>
                </div>
                
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
                                    <button
                                      onClick={() => viewReport(report)}
                                      className="inline-flex items-center gap-1 px-4 py-2 bg-white hover:bg-green-50 text-green-600 border-2 border-green-600 text-sm font-semibold rounded-lg shadow-md transition"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                      </svg>
                                      View
                                    </button>
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
                                <div className="flex justify-center gap-3">
                                  <button
                                    onClick={() => approveReport(report.id)}
                                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 text-sm font-medium transition"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => openRejectModal(report)}
                                    className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 text-sm font-medium transition"
                                  >
                                    Reject
                                  </button>
                                </div>
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
                
                {/* Filters */}
                <div className="mb-4 flex gap-4">
                  <select
                    value={approvedTypeFilter}
                    onChange={(e) => {
                      setApprovedTypeFilter(e.target.value);
                      setCurrentApprovedPage(1);
                    }}
                    className="px-4 py-2 border rounded-lg"
                  >
                    <option value="">All Types</option>
                    <option value="monthly_bmi">Monthly BMI</option>
                    <option value="pre_post">List for Feeding</option>
                    <option value="overview">BMI and HFA Report</option>
                  </select>
                  <select
                    value={approvedStatusFilter}
                    onChange={(e) => {
                      setApprovedStatusFilter(e.target.value);
                      setCurrentApprovedPage(1);
                    }}
                    className="px-4 py-2 border rounded-lg"
                  >
                    <option value="">All Status</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                
                {approvedReports.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-500 text-lg">No reports found</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead className={approvedStatusFilter === 'rejected' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}>
                          <tr>
                            <th className="px-6 py-4 text-left text-sm font-bold">Document Title</th>
                            <th className="px-6 py-4 text-left text-sm font-bold">
                              {approvedStatusFilter === 'rejected' ? 'Date Rejected' : 'Date Approved'}
                            </th>
                            <th className="px-6 py-4 text-center text-sm font-bold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {paginatedApproved.map((report) => (
                            <tr key={report.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4">
                                <div className="text-sm font-semibold text-gray-900">{report.title}</div>
                                {report.status === 'rejected' && report.review_notes && (
                                  <div className="mt-2 text-xs bg-red-50 text-red-800 border border-red-200 px-3 py-2 rounded">
                                    <strong>Rejection Reason:</strong> {report.review_notes}
                                  </div>
                                )}
                                {report.pdf_file && (
                                  <div className="flex gap-3 mt-2">
                                    <button
                                      onClick={() => viewReport(report)}
                                      className={`inline-flex items-center gap-1 px-4 py-2 bg-white text-sm font-semibold rounded-lg shadow-md transition border-2 ${
                                        report.status === 'rejected'
                                          ? 'hover:bg-red-50 text-red-600 border-red-600'
                                          : 'hover:bg-green-50 text-green-600 border-green-600'
                                      }`}
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                      </svg>
                                      View
                                    </button>
                                    <button
                                      onClick={async () => {
                                        try {
                                          // Download overview report (BMI/HFA)
                                          if (report.report_type === 'overview') {
                                            await downloadOverviewReportPdf(report);
                                          }
                                          // Download feeding list
                                          else if (report.report_type === 'pre_post' && report.data) {
                                            const reportData = typeof report.data === 'string' ? JSON.parse(report.data) : report.data;
                                            const schoolName = reportData.school_name || 'SCIENCE CITY OF MUNOZ';
                                            const schoolYear = reportData.school_year || '2025-2026';
                                            
                                            const response = await fetch('/api/reports/generate-feeding-list', {
                                              method: 'POST',
                                              credentials: 'include',
                                              headers: { 'Content-Type': 'application/json' },
                                              body: JSON.stringify({
                                                report_id: report.id,
                                                title: report.title,
                                                school_name: schoolName,
                                                school_year: schoolYear,
                                              }),
                                            });
                                            
                                            const data = await response.json();
                                            if (data.success && data.pdf_data) {
                                              const { generateFeedingListPDF } = await import('@/components/FeedingListPdfGenerator');
                                              const doc = generateFeedingListPDF(data.pdf_data);
                                              doc.save(`${report.title}.pdf`);
                                            } else {
                                              alert(`Error generating PDF: ${data.message || 'Unknown error'}`);
                                            }
                                          }
                                          // Download monthly BMI
                                          else if (report.report_type === 'monthly_bmi' && report.data) {
                                            const reportData = typeof report.data === 'string' ? JSON.parse(report.data) : report.data;
                                            const gradeLevel = reportData.grade_level;
                                            const reportMonth = reportData.report_month;
                                            const schoolName = reportData.school_name || 'SCIENCE CITY OF MUNOZ';
                                            const schoolYear = reportData.school_year || '2025-2026';
                                            
                                            if (gradeLevel && reportMonth) {
                                              const response = await fetch('/api/reports/generate-pdf', {
                                                method: 'POST',
                                                credentials: 'include',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                  report_id: report.id,
                                                  grade_level: gradeLevel,
                                                  report_month: reportMonth,
                                                  school_name: schoolName,
                                                  school_year: schoolYear,
                                                }),
                                              });
                                              
                                              const data = await response.json();
                                              if (data.success && data.pdf_data) {
                                                const { generatePDF } = await import('@/components/PdfGenerator');
                                                const doc = generatePDF(data.pdf_data);
                                                doc.save(`${report.title}.pdf`);
                                              } else {
                                                alert(`Error generating PDF: ${data.message || 'Unknown error'}`);
                                              }
                                            }
                                          }
                                        } catch (error) {
                                          console.error('[ADMIN] Error downloading PDF:', error);
                                          alert('Error downloading PDF');
                                        }
                                      }}
                                      className={`inline-flex items-center gap-1 px-4 py-2 text-white text-sm font-semibold rounded-lg shadow-md transition ${
                                        report.status === 'rejected'
                                          ? 'bg-red-600 hover:bg-red-700'
                                          : 'bg-green-600 hover:bg-green-700'
                                      }`}
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                      </svg>
                                      Download
                                    </button>
                                    <button
                                      onClick={() => {
                                        setReportToDelete(report);
                                        setShowDeleteModal(true);
                                      }}
                                      className="inline-flex items-center gap-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg shadow-md transition"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900">
                                <div className="text-sm text-gray-900">
                                  {report.reviewed_at
                                    ? new Date(report.reviewed_at).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                      })
                                    : 'N/A'}
                                </div>
                                <div className="text-xs text-gray-400 mt-1">
                                  Requested: {new Date(report.generated_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                  })}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                                  report.status === 'rejected'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {report.status === 'rejected' ? 'Rejected' : 'Approved'}
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

      {/* Overview Report Modal */}
      {showOverviewModal && selectedReport && overviewReportData.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-[95vw] max-h-[95vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <div>
                <h3 className="text-lg font-bold">{selectedReport.title}</h3>
                <p className="text-sm text-gray-600">Both Formats (Detailed with % and Simple counts only)</p>
              </div>
              <button
                onClick={() => {
                  setShowOverviewModal(false);
                  setSelectedReport(null);
                  setOverviewReportData([]);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              {/* Page 1: Detailed Report with Percentages */}
              <div className="mb-8">
                <div className="flex items-start gap-4 mb-6">
                  <img 
                    src="/logo.png" 
                    alt="School Logo" 
                    className="w-20 h-20 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <div className="flex-1 text-center">
                    <h2 className="text-base font-normal">Department of Education</h2>
                    <h3 className="text-base font-normal">Bureau of Learner Support Services</h3>
                    <h4 className="text-base font-medium">SCHOOL HEALTH DIVISION</h4>
                    <h5 className="text-lg font-bold mt-1">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</h5>
                    <h6 className="text-sm italic mt-1">Baseline SY 2025-2026</h6>
                  </div>
                </div>
                <h4 className="text-center text-lg font-bold mb-4 text-blue-700">Page 1: Detailed Report (with percentages)</h4>
                <DetailedReportTable data={overviewReportData} />
              </div>

              {/* Page Break / Divider */}
              <div className="my-8 border-t-4 border-gray-400 relative">
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white px-4 text-gray-600 font-semibold">
                  Page Break
                </div>
              </div>

              {/* Page 2: Simple Report (counts only) */}
              <div className="mt-8">
                <div className="flex items-start gap-4 mb-6">
                  <img 
                    src="/logo.png" 
                    alt="School Logo" 
                    className="w-20 h-20 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <div className="flex-1 text-center">
                    <h2 className="text-base font-normal">Department of Education</h2>
                    <h3 className="text-base font-normal">Bureau of Learner Support Services</h3>
                    <h4 className="text-base font-medium">SCHOOL HEALTH DIVISION</h4>
                    <h5 className="text-lg font-bold mt-1">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</h5>
                    <h6 className="text-sm italic mt-1">Baseline SY 2025-2026</h6>
                  </div>
                </div>
                <h4 className="text-center text-lg font-bold mb-4 text-green-700">Page 2: Simple Report (counts only)</h4>
                <SimpleReportTable data={overviewReportData} />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button
                onClick={() => {
                  setShowOverviewModal(false);
                  setSelectedReport(null);
                  setOverviewReportData([]);
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Modal for Feeding Lists and Monthly BMI Reports */}
      {showPdfModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">{selectedReport?.title || 'Report Preview'}</h3>
              <button
                onClick={() => {
                  setShowPdfModal(false);
                  setPdfDataUrl('');
                  setSelectedReport(null);
                }}
                className="text-white hover:text-gray-200 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <iframe
                src={`${pdfDataUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                className="w-full h-full min-h-[600px] border rounded"
                title="PDF Preview"
              />
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-between items-center gap-3">
              <div>
                {selectedReport?.status === 'approved' ? (
                  <a
                    href={pdfDataUrl}
                    download={`${selectedReport?.title || 'report'}.pdf`}
                    className="inline-flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download PDF
                  </a>
                ) : (
                  <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-3 py-2">
                    {selectedReport?.status === 'rejected'
                      ? '⛔ This report has been rejected and cannot be downloaded.'
                      : '⏳ This report is pending review. Download will be available once approved.'}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setShowPdfModal(false);
                  setPdfDataUrl('');
                  setSelectedReport(null);
                }}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && reportToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4 rounded-t-xl">
              <h3 className="text-xl font-bold text-white">Delete Report</h3>
            </div>
            <div className="p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className="flex-shrink-0">
                  <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-800 font-semibold mb-2">
                    Are you sure to delete this report?
                  </p>
                  <p className="text-gray-600 text-sm">
                    Report: <span className="font-semibold">{reportToDelete.title}</span>
                  </p>
                  <p className="text-gray-500 text-sm mt-1">
                    This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t rounded-b-xl flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setReportToDelete(null);
                }}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-semibold transition"
              >
                No
              </button>
              <button
                onClick={() => deleteReport(reportToDelete.id)}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Confirmation Modal */}
      {showRejectModal && reportToReject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4 rounded-t-xl">
              <h3 className="text-xl font-bold text-white">Reject Report</h3>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <p className="text-gray-800 font-semibold mb-2">
                  Report: <span className="text-gray-900">{reportToReject.title}</span>
                </p>
                <p className="text-gray-600 text-sm mb-4">
                  Please provide a reason for rejecting this report. This note will be visible to the nutritionist.
                </p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Rejection Reason <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={rejectionNotes}
                  onChange={(e) => setRejectionNotes(e.target.value)}
                  placeholder="Enter the reason for rejection..."
                  rows={5}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t rounded-b-xl flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setReportToReject(null);
                  setRejectionNotes('');
                }}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={rejectReport}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition"
              >
                Reject Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Confirmation Modal */}
      {showRejectModal && reportToReject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4 rounded-t-xl">
              <h3 className="text-xl font-bold text-white">Reject Report</h3>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <p className="text-gray-800 font-semibold mb-2">
                  Report: <span className="text-gray-900">{reportToReject.title}</span>
                </p>
                <p className="text-gray-600 text-sm mb-4">
                  Please provide a reason for rejecting this report. This note will be visible to the nutritionist.
                </p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Rejection Reason <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={rejectionNotes}
                  onChange={(e) => setRejectionNotes(e.target.value)}
                  placeholder="Enter the reason for rejection..."
                  rows={5}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t rounded-b-xl flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setReportToReject(null);
                  setRejectionNotes('');
                }}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={rejectReport}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition"
              >
                Reject Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
