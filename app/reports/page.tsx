'use client';

import { useEffect, useState } from 'react';
import React from 'react';
import NutritionistSidebar from '@/components/NutritionistSidebar';
import PdfGenerator from '@/components/PdfGenerator';
import FeedingListPdfGenerator from '@/components/FeedingListPdfGenerator';
import FeedingProgramReportPdfGenerator from '@/components/FeedingProgramReportPdfGenerator';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  totalBeneficiaries: { M: number; F: number; Total: number };
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
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showOverviewModal, setShowOverviewModal] = useState(false);
  const [overviewReportData, setOverviewReportData] = useState<GradeData[]>([]);
  const [overviewFormat, setOverviewFormat] = useState<'detailed' | 'simple'>('detailed');
  const [pdfDataUrl, setPdfDataUrl] = useState<string>('');
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [formError, setFormError] = useState('');
  const [approvedReportsCount, setApprovedReportsCount] = useState(0);
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
        // Count approved reports for nutritionist notification badge
        const approvedCount = (data.reports || []).filter((r: Report) => r.status === 'approved').length;
        setApprovedReportsCount(approvedCount);
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
    const schoolName = formData.get('school_name') as string;
    const schoolYear = formData.get('school_year') as string;

    if (reportType === 'monthly_bmi' && !reportMonth) {
      setFormError('Please select a month for monthly BMI reports');
      return;
    }

    // Add school configuration to data
    const dataObj: any = {};
    if (schoolName) dataObj.school_name = schoolName;
    if (schoolYear) dataObj.school_year = schoolYear;
    if (Object.keys(dataObj).length > 0) {
      formData.set('data', JSON.stringify(dataObj));
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
      pre_post: 'List for Feeding',
      feeding_program: 'Feeding Program',
      overview: 'BMI and HFA Report',
    };
    return types[type] || type.replace('_', ' ');
  };

  const downloadOverviewReportPdf = async (report: Report, preview = false) => {
    try {
      if (!report.data) {
        alert('Report data not found. Please regenerate the report.');
        return;
      }

      const reportData = typeof report.data === 'string' ? JSON.parse(report.data) : report.data;
      
      if (!reportData.reportData || !Array.isArray(reportData.reportData)) {
        alert('Report data is invalid. Please regenerate the report.');
        return;
      }

      // Recalculate totalBeneficiaries for each grade (in case it's missing from old reports)
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
      
      console.log('[PDF] Generating PDF with totals:', data.map((g: GradeData) => ({ 
        grade: g.gradeLevel, 
        primary: (g.bmi && g.bmi.primaryBeneficiaries && g.bmi.primaryBeneficiaries.Total) || 0,
        secondary: (g.hfa && g.hfa.secondaryBeneficiaries && g.hfa.secondaryBeneficiaries.Total) || 0,
        total: g.totalBeneficiaries 
      })));
      
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
        ['Pupils Weighed', 'Severely Wasted', '', 'Wasted', '', 'Normal', '', 'Overweight', '', 'Obese', '',
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

      // Build simple table data
      const simpleHeaders = [
        [{ content: 'Grade Level', rowSpan: 3 }, { content: 'Enrolment', rowSpan: 3 },
         { content: 'BODY MASS INDEX (BMI)', colSpan: 4 },
         { content: 'HEIGHT FOR AGE (HFA)', colSpan: 4 },
         { content: 'TOTAL\n(Primary and Secondary)', rowSpan: 3 }]
      ];

      const simpleSubHeaders = [
        ['Pupils Weighed', 'Severely Wasted', 'Wasted', 'PRIMARY\nBENEFICIARIES',
         'Pupils Taken Height', 'Severely Stunted\nnot SW or W', 'Stunted not SW or W', 'SECONDARY\nBENEFICIARIES']
      ];

      const simpleColHeaders = [
        ['No.', 'No.', 'No.', 'No.', 'No.', 'No.', 'No.', 'No.']
      ];

      const simpleRows: any[] = [];
      data.forEach((grade: GradeData) => {
        // Calculate totals with defensive checks
        const primaryM = Number((grade.bmi && grade.bmi.primaryBeneficiaries && grade.bmi.primaryBeneficiaries.M) || 0);
        const primaryF = Number((grade.bmi && grade.bmi.primaryBeneficiaries && grade.bmi.primaryBeneficiaries.F) || 0);
        const primaryTotal = Number((grade.bmi && grade.bmi.primaryBeneficiaries && grade.bmi.primaryBeneficiaries.Total) || 0);
        const secondaryM = Number((grade.hfa && grade.hfa.secondaryBeneficiaries && grade.hfa.secondaryBeneficiaries.M) || 0);
        const secondaryF = Number((grade.hfa && grade.hfa.secondaryBeneficiaries && grade.hfa.secondaryBeneficiaries.F) || 0);
        const secondaryTotal = Number((grade.hfa && grade.hfa.secondaryBeneficiaries && grade.hfa.secondaryBeneficiaries.Total) || 0);
        
        const totalM = primaryM + secondaryM;
        const totalF = primaryF + secondaryF;
        const totalTotal = primaryTotal + secondaryTotal;
        
        console.log(`[PDF SIMPLE ROW] ${grade.gradeLevel}: M(${primaryM}+${secondaryM}=${totalM}), F(${primaryF}+${secondaryF}=${totalF}), Total(${primaryTotal}+${secondaryTotal}=${totalTotal})`);
        
        // Male row
        const maleRow = [
          { content: grade.gradeLevel, rowSpan: 3 },
          `M\n${grade.enrollment.M}`,
          grade.bmi.pupilsWeighed.M || 0,
          grade.bmi.severelyWasted.M || 0,
          grade.bmi.wasted.M || 0,
          grade.bmi.primaryBeneficiaries.M || 0,
          grade.hfa.pupilsTakenHeight.M || 0,
          grade.hfa.severelyStuntedNotSW.M || 0,
          grade.hfa.stuntedNotSW.M || 0,
          grade.hfa.secondaryBeneficiaries.M || 0,
          totalM
        ];
        console.log(`[PDF MALE ROW] Length: ${maleRow.length}, Last value (total): ${maleRow[maleRow.length - 1]}`);
        simpleRows.push(maleRow);
        
        // Female row
        const femaleRow = [
          `F\n${grade.enrollment.F}`,
          grade.bmi.pupilsWeighed.F || 0,
          grade.bmi.severelyWasted.F || 0,
          grade.bmi.wasted.F || 0,
          grade.bmi.primaryBeneficiaries.F || 0,
          grade.hfa.pupilsTakenHeight.F || 0,
          grade.hfa.severelyStuntedNotSW.F || 0,
          grade.hfa.stuntedNotSW.F || 0,
          grade.hfa.secondaryBeneficiaries.F || 0,
          totalF
        ];
        console.log(`[PDF FEMALE ROW] Length: ${femaleRow.length}, Last value (total): ${femaleRow[femaleRow.length - 1]}`);
        simpleRows.push(femaleRow);
        
        // Total row
        const totalRow = [
          `Total\n${grade.enrollment.Total}`,
          grade.bmi.pupilsWeighed.Total || 0,
          grade.bmi.severelyWasted.Total || 0,
          grade.bmi.wasted.Total || 0,
          grade.bmi.primaryBeneficiaries.Total || 0,
          grade.hfa.pupilsTakenHeight.Total || 0,
          grade.hfa.severelyStuntedNotSW.Total || 0,
          grade.hfa.stuntedNotSW.Total || 0,
          grade.hfa.secondaryBeneficiaries.Total || 0,
          totalTotal
        ];
        console.log(`[PDF TOTAL ROW] Length: ${totalRow.length}, Last value (total): ${totalRow[totalRow.length - 1]}`);
        simpleRows.push(totalRow);
      });

      autoTable(doc, {
        head: [...simpleHeaders, ...simpleSubHeaders, ...simpleColHeaders],
        body: simpleRows,
        startY: 45,
        theme: 'grid',
        styles: { 
          fontSize: 6.5, 
          cellPadding: 1.5, 
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
          cellPadding: 1.5,
          lineColor: [0, 0, 0],
          lineWidth: 0.1
        },
        margin: { left: 14, right: 14 },
        tableWidth: 'auto'
      });

      // Prepared by section (on page 2, after simple table)
      const preparedByName = report.generator_name || 'Nutritionist';
      const preparedByY = (doc as any).lastAutoTable.finalY + 12;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Prepared by:', doc.internal.pageSize.getWidth() - 80, preparedByY);
      doc.setFont('helvetica', 'bold');
      doc.text(preparedByName, doc.internal.pageSize.getWidth() - 80, preparedByY + 8);
      doc.setFont('helvetica', 'normal');
      doc.text('Nutritionist', doc.internal.pageSize.getWidth() - 80, preparedByY + 14);

      if (preview) {
        const pdfBlob = doc.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        setPdfDataUrl(pdfUrl);
        setSelectedReport(report);
        setShowPdfModal(true);
      } else {
        const fileName = `BMI_and_HFA_Report_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
      }

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  const viewOverviewReport = async (report: Report) => {
    try {
      // Determine format from pdf_file or data.format, default to 'detailed'
      let format: 'detailed' | 'simple' = 'detailed';
      
      if (report.pdf_file?.startsWith('overview:')) {
        format = report.pdf_file.split(':')[1] as 'detailed' | 'simple';
      } else if (report.data) {
        const reportData = typeof report.data === 'string' ? JSON.parse(report.data) : report.data;
        format = reportData.format || 'detailed';
      }
      
      if (!report.data) {
        alert('Report data not found. Please regenerate the report from the Overview page.');
        return;
      }
      
      const reportData = typeof report.data === 'string' ? JSON.parse(report.data) : report.data;
      
      // If reportData doesn't exist or is invalid, try to regenerate it
      if (!reportData.reportData || !Array.isArray(reportData.reportData) || reportData.reportData.length === 0) {
        console.log('[REPORTS] Report data missing or invalid, regenerating...');
        
        try {
          // Fetch all students and BMI records to regenerate the report
          const studentsResponse = await fetch('/api/students', { credentials: 'include' });
          const studentsData = await studentsResponse.json();
          const allStudents = studentsData.success ? studentsData.students : [];

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
            gradeData.totalBeneficiaries.M = gradeData.bmi.primaryBeneficiaries.M + gradeData.hfa.secondaryBeneficiaries.M;
            gradeData.totalBeneficiaries.F = gradeData.bmi.primaryBeneficiaries.F + gradeData.hfa.secondaryBeneficiaries.F;
            gradeData.totalBeneficiaries.Total = gradeData.bmi.primaryBeneficiaries.Total + gradeData.hfa.secondaryBeneficiaries.Total;

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
            grandTotal.totalBeneficiaries.M += grade.totalBeneficiaries.M;
            grandTotal.totalBeneficiaries.F += grade.totalBeneficiaries.F;
            grandTotal.totalBeneficiaries.Total += grade.totalBeneficiaries.Total;
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

          console.log('[REPORTS] Successfully regenerated report data with', generatedReportData.length, 'grades');
          await downloadOverviewReportPdf(report, true);
          return;
        } catch (regenerateError) {
          console.error('[REPORTS] Error regenerating report data:', regenerateError);
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
      
      console.log('[REPORTS] Updated report data with totals:', updatedReportData.map((g: GradeData) => ({ 
        grade: g.gradeLevel, 
        total: g.totalBeneficiaries 
      })));
      await downloadOverviewReportPdf(report, true);
    } catch (error: any) {
      console.error('Error loading overview report:', error);
      alert(`Error loading report: ${error.message || 'Unknown error'}`);
    }
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

  const getViewUrl = (report: Report) => {
    if (!report.pdf_file) return '';
    
    // Don't create URLs for db:csv: paths - they should be handled by viewCsvReport
    if (report.pdf_file.startsWith('db:csv:')) {
      return '#';
    }
    
    // Check if it's a CSV file
    if (report.pdf_file.endsWith('.csv')) {
      return `/api/reports/view-csv?path=${encodeURIComponent(report.pdf_file)}`;
    }
    
    // For HTML/PDF files, use the normalized path
    return normalizePdfPath(report.pdf_file);
  };

  const viewCsvReport = async (report: Report) => {
    if (!report.pdf_file || (!report.pdf_file.endsWith('.csv') && !report.pdf_file.startsWith('db:csv:'))) {
      // Not a CSV, use normal view
      window.open(getViewUrl(report), '_blank');
      return;
    }

    // Check if CSV is stored in database
    if (report.pdf_file.startsWith('db:csv:') && report.data) {
      try {
        const reportData = typeof report.data === 'string' ? JSON.parse(report.data) : report.data;
        if (reportData.csv_content) {
          const lines = reportData.csv_content.split('\n').filter((line: string) => line.trim());
          
          if (lines.length > 0) {
            // Parse CSV (handle quoted values)
            const parseCsvLine = (line: string): string[] => {
              const result: string[] = [];
              let current = '';
              let inQuotes = false;
              
              for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') {
                  inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                  result.push(current.trim());
                  current = '';
                } else {
                  current += char;
                }
              }
              result.push(current.trim());
              return result;
            };

            const headers = parseCsvLine(lines[0]);
            
            // Check if we have a two-row header structure (Age spanning Y and M)
            let hasTwoRowHeader = false;
            if (lines.length > 1) {
              const secondRow = parseCsvLine(lines[1]);
              // Check if second row has Y and M as sub-headers
              if (secondRow.includes('Y') && secondRow.includes('M') && headers.includes('Age')) {
                hasTwoRowHeader = true;
                // Don't modify headers - keep the empty string as is for proper merging
              }
            }
            
            // Check if this is old format (has "Age Y - M" as single column)
            // If so, regenerate the CSV
            if (headers.includes('Age Y - M')) {
              console.log('[VIEW CSV] Detected old format, regenerating CSV...');
              // Try to regenerate if it's a monthly BMI report
              if (report.report_type === 'monthly_bmi' && report.data) {
                try {
                  const reportDataForRegen = typeof report.data === 'string' ? JSON.parse(report.data) : report.data;
                  const gradeLevel = reportDataForRegen.grade_level;
                  const reportMonth = reportDataForRegen.report_month;
                  
                  if (gradeLevel && reportMonth) {
                    const response = await fetch('/api/reports/generate-csv', {
                      method: 'POST',
                      credentials: 'include',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        report_id: report.id,
                        grade_level: gradeLevel,
                        report_month: reportMonth,
                      }),
                    });
                    
                    if (!response.ok) {
                      throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    
                    const data = await response.json();
                    if (data.success && data.csv_content) {
                      // Parse the new CSV
                      const newLines = data.csv_content.split('\n').filter((line: string) => line.trim());
                      if (newLines.length > 0) {
                        const newHeaders = parseCsvLine(newLines[0]);
                        const newRows = newLines.slice(1).map((line: string) => parseCsvLine(line));
                        
                        setCsvHeaders(newHeaders);
                        setCsvData(newRows);
                        setSelectedReport(report);
                        setShowCsvModal(true);
                        return;
                      } else {
                        throw new Error('Regenerated CSV is empty');
                      }
                    } else {
                      throw new Error(data.message || 'Failed to regenerate CSV');
                    }
                  } else {
                    throw new Error('Missing grade level or report month');
                  }
                } catch (error: any) {
                  console.error('Error regenerating CSV:', error);
                  alert(`Error regenerating CSV: ${error.message || 'Unknown error'}. Showing old format.`);
                  // Fall through to show old format
                }
              }
            }
            
            // If we have two-row header, skip the second header row when getting data
            const dataStartIndex = hasTwoRowHeader ? 2 : 1;
            const rows = lines.slice(dataStartIndex).map((line: string) => parseCsvLine(line));

            setCsvHeaders(headers);
            setCsvData(rows);
            setSelectedReport(report);
            setShowCsvModal(true);
            return;
          }
        }
      } catch (error) {
        console.error('Error parsing CSV from database:', error);
      }
    }

    // Try to fetch from storage or regenerate if needed
    try {
      // If it's a monthly BMI report, try to regenerate first (in case CSV is missing)
      if (report.report_type === 'monthly_bmi' && report.data) {
        try {
          const reportData = typeof report.data === 'string' ? JSON.parse(report.data) : report.data;
          const gradeLevel = reportData.grade_level;
          const reportMonth = reportData.report_month;
          
          if (gradeLevel && reportMonth) {
            const response = await fetch('/api/reports/generate-csv', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                report_id: report.id,
                grade_level: gradeLevel,
                report_month: reportMonth,
              }),
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data.success && data.csv_content) {
                // Parse the new CSV
                const newLines = data.csv_content.split('\n').filter((line: string) => line.trim());
                if (newLines.length > 0) {
                  const parseCsvLine = (line: string): string[] => {
                    const result: string[] = [];
                    let current = '';
                    let inQuotes = false;
                    
                    for (let i = 0; i < line.length; i++) {
                      const char = line[i];
                      if (char === '"') {
                        inQuotes = !inQuotes;
                      } else if (char === ',' && !inQuotes) {
                        result.push(current.trim());
                        current = '';
                      } else {
                        current += char;
                      }
                    }
                    result.push(current.trim());
                    return result;
                  };
                  
                  const newHeaders = parseCsvLine(newLines[0]);
                  const newRows = newLines.slice(1).map((line: string) => parseCsvLine(line));
                  
                  setCsvHeaders(newHeaders);
                  setCsvData(newRows);
                  setSelectedReport(report);
                  setShowCsvModal(true);
                  return;
                }
              }
            }
          }
        } catch (regenError) {
          console.error('Error regenerating CSV, trying to fetch from storage:', regenError);
        }
      }
      
      // Try to fetch from storage
      const response = await fetch(`/api/reports/view-csv?path=${encodeURIComponent(report.pdf_file)}&report_id=${report.id}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const csvText = await response.text();
        const lines = csvText.split('\n').filter(line => line.trim());
        
        if (lines.length > 0) {
          // Parse CSV (handle quoted values)
          const parseCsvLine = (line: string): string[] => {
            const result: string[] = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
              } else {
                current += char;
              }
            }
            result.push(current.trim());
            return result;
          };

          const headers = parseCsvLine(lines[0]);
          
          // Check if we have a two-row header structure (Age spanning Y and M)
          let hasTwoRowHeader = false;
          if (lines.length > 1) {
            const secondRow = parseCsvLine(lines[1]);
            // Check if second row has Y and M as sub-headers
            if (secondRow.includes('Y') && secondRow.includes('M') && headers.includes('Age')) {
              hasTwoRowHeader = true;
              // Don't modify headers - keep the empty string as is
            }
          }
          
          // If we have two-row header, skip the second header row when getting data
          const dataStartIndex = hasTwoRowHeader ? 2 : 1;
          const rows = lines.slice(dataStartIndex).map(line => parseCsvLine(line));

          setCsvHeaders(headers);
          setCsvData(rows);
          setSelectedReport(report);
          setShowCsvModal(true);
        } else {
          alert('CSV file is empty');
        }
      } else {
        const errorText = await response.text().catch(() => '');
        console.error('Error loading CSV:', response.status, errorText);
        alert(`Error loading CSV file (${response.status}). The CSV may not have been generated yet. Please try again or regenerate the report.`);
      }
    } catch (error: any) {
      console.error('Error loading CSV:', error);
      alert(`Error loading CSV file: ${error.message || 'Unknown error'}. Please try regenerating the report.`);
    }
  };

  // View PDF report - always fetch fresh data from database
  const viewPdfReport = async (report: Report) => {
    try {
      // If PDF file is already a Supabase URL (https://...), just display it
      if (report.pdf_file && report.pdf_file.startsWith('https://')) {
        setPdfDataUrl(report.pdf_file);
        setSelectedReport(report);
        setShowPdfModal(true);
        return;
      }

      // Check if it's a monthly BMI report
      if (report.report_type === 'monthly_bmi' && report.data) {
        const reportData = typeof report.data === 'string' ? JSON.parse(report.data) : report.data;
        let gradeLevel = reportData.grade_level;
        let reportMonth = reportData.report_month;
        
        // For old reports, try to extract from title if missing
        if (!gradeLevel || !reportMonth) {
          // Extract from title like "grade 1 november" or "january grade 1 test"
          const titleLower = report.title.toLowerCase();
          
          // Extract grade level
          const gradeMatch = titleLower.match(/grade\s+(\d+|kinder)/i);
          if (gradeMatch) {
            const gradeNum = gradeMatch[1];
            if (gradeNum === 'kinder') {
              gradeLevel = 'Kinder';
            } else {
              gradeLevel = `Grade ${gradeNum}`;
            }
          }
          
          // Extract month - try to find month name in title
          const months = ['january', 'february', 'march', 'april', 'may', 'june', 
                         'july', 'august', 'september', 'october', 'november', 'december'];
          const foundMonth = months.find(m => titleLower.includes(m));
          if (foundMonth) {
            // Extract year from generated_at date or use 2025
            const reportDate = new Date(report.generated_at);
            const year = reportDate.getFullYear();
            const monthIndex = months.indexOf(foundMonth) + 1;
            reportMonth = `${year}-${monthIndex.toString().padStart(2, '0')}`;
          }
        }
        
        const schoolName = reportData.school_name || 'SCIENCE CITY OF MUNOZ';
        const schoolYear = reportData.school_year || '2025-2026';
        
        if (!gradeLevel || !reportMonth) {
          alert('Report data is incomplete. Missing grade level or report month. Please regenerate this report.');
          return;
        }

        // Fetch fresh data from database
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

      // Check if it's a feeding program report
      if (report.report_type === 'feeding_program' && report.data) {
        const reportData = typeof report.data === 'string' ? JSON.parse(report.data) : report.data;
        const programId = reportData.program_id;
        const programName = reportData.program_name;
        const startDate = reportData.start_date;
        const endDate = reportData.end_date;
        const schoolName = reportData.school_name || 'SCIENCE CITY OF MUNOZ';
        const schoolYear = reportData.school_year || '2025-2026';
        
        if (!programId) {
          alert('Report data is incomplete. Missing program ID.');
          return;
        }

        const response = await fetch('/api/reports/generate-feeding-program-report', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            report_id: report.id,
            program_id: programId,
            program_name: programName,
            start_date: startDate,
            end_date: endDate,
            title: report.title,
            school_name: schoolName,
            school_year: schoolYear,
          }),
        });
        
        const data = await response.json();
        if (data.success && data.pdf_data) {
          setSelectedReport(report);
          (window as any).currentFeedingProgramReportPdfData = data.pdf_data;
          
          const { generateFeedingProgramReportPDF } = await import('@/components/FeedingProgramReportPdfGenerator');
          const doc = generateFeedingProgramReportPDF(data.pdf_data);
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
      
      alert('Report file is not available yet. This report type may not support file generation.');
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      alert(`Error generating PDF: ${error.message || 'Unknown error'}`);
    }
  };

  // Helper function to upload PDF to Supabase Storage (not used for now)
  const uploadPdfToStorage = async (pdfBlob: Blob, reportId: number) => {
    try {
      const formData = new FormData();
      formData.append('pdf', pdfBlob, `report-${reportId}.pdf`);
      formData.append('report_id', reportId.toString());

      const response = await fetch('/api/reports/upload-pdf', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        console.log('[REPORTS] PDF uploaded to storage:', data.pdf_url);
        await loadReports();
      } else {
        console.error('[REPORTS] Error uploading PDF:', data.message);
      }
    } catch (error) {
      console.error('[REPORTS] Error uploading PDF:', error);
    }
  };

  const paginatedReports = reports.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(reports.length / itemsPerPage);
  const startRecord = reports.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endRecord = Math.min(currentPage * itemsPerPage, reports.length);

  return (
    <div className="bg-slate-50 min-h-screen">
      <PdfGenerator />
      <FeedingListPdfGenerator />
      <FeedingProgramReportPdfGenerator />
      <NutritionistSidebar approvedReportsCount={approvedReportsCount} />

      <main className="md:ml-64 min-h-screen bg-slate-50">
        {/* Page Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Reports</h1>
            <p className="text-xs text-slate-500 mt-0.5">Generate, manage, and submit reports for approval</p>
          </div>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-sm transition"
            style={{ background: '#1a3a6c' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Generate Report
          </button>
        </div>

        <div className="p-5">
        {/* Reports List */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" style={{ background: '#1a3a6c' }}>
            <h2 className="text-sm font-bold text-white">My Reports</h2>
            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2 py-1 text-xs border border-white/30 bg-white/10 text-white rounded-lg focus:outline-none"
              >
                <option value="" className="text-slate-800 bg-white">All Status</option>
                <option value="draft" className="text-slate-800 bg-white">Draft</option>
                <option value="pending" className="text-slate-800 bg-white">Pending</option>
                <option value="approved" className="text-slate-800 bg-white">Approved</option>
                <option value="rejected" className="text-slate-800 bg-white">Rejected</option>
              </select>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-2 py-1 text-xs border border-white/30 bg-white/10 text-white rounded-lg focus:outline-none"
              >
                <option value="" className="text-slate-800 bg-white">All Types</option>
                <option value="monthly_bmi" className="text-slate-800 bg-white">Monthly BMI</option>
                <option value="pre_post" className="text-slate-800 bg-white">List for Feeding</option>
                <option value="overview" className="text-slate-800 bg-white">BMI and HFA Report</option>
              </select>
            </div>
          </div>

          <div className="p-4">
            {loading ? (
              <p className="text-center text-slate-400 py-8 text-sm">Loading...</p>
            ) : paginatedReports.length === 0 ? (
              <p className="text-center text-slate-400 py-8 text-sm">No reports found</p>
            ) : (
              paginatedReports.map((report) => (
                <div key={report.id} className="bg-slate-50 hover:bg-blue-50/30 transition rounded-xl p-3 sm:p-4 mb-2 border border-slate-200">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    {/* Report Info Section */}
                    <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{report.title}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusClass(report.status)} w-fit`}>
                            {report.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1 flex-wrap">
                          <p className="text-xs text-gray-600 capitalize">{formatReportType(report.report_type)}</p>
                          <span className="hidden sm:inline text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-400">Requested: {new Date(report.generated_at).toLocaleString()}</span>
                          {report.status === 'approved' && report.reviewed_at && (
                            <>
                              <span className="hidden sm:inline text-xs text-gray-400">•</span>
                              <span className="text-xs text-green-600 font-medium">Approved: {new Date(report.reviewed_at).toLocaleString()}</span>
                            </>
                          )}
                          {report.status === 'rejected' && report.reviewed_at && (
                            <>
                              <span className="hidden sm:inline text-xs text-gray-400">•</span>
                              <span className="text-xs text-red-600 font-medium">Rejected: {new Date(report.reviewed_at).toLocaleString()}</span>
                            </>
                          )}
                        </div>
                        {report.review_notes && (
                          <p className={`text-xs mt-2 px-2 py-1 rounded ${
                            report.status === 'rejected' 
                              ? 'bg-red-50 text-red-800 border border-red-200' 
                              : 'bg-yellow-50 text-gray-600'
                          }`}>
                            <strong>{report.status === 'rejected' ? 'Rejection Reason:' : 'Notes:'}</strong> {report.review_notes}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Actions Section */}
                    <div className="flex flex-wrap items-center gap-2 lg:flex-shrink-0">
                        {report.report_type === 'overview' ? (
                          <>
                            <button
                              onClick={() => viewOverviewReport(report)}
                              className="inline-flex items-center gap-1 px-3 sm:px-4 py-2 bg-white hover:bg-green-50 text-green-600 border-2 border-green-600 text-xs sm:text-sm font-semibold rounded-lg shadow-md transition"
                            >
                              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              <span className="hidden sm:inline">View</span>
                            </button>
                            {report.status === 'approved' && (
                              <button
                                onClick={() => downloadOverviewReportPdf(report)}
                                className="inline-flex items-center gap-1 px-3 sm:px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-md transition"
                              >
                                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                <span className="hidden sm:inline">Download</span>
                              </button>
                            )}
                          </>
                        ) : report.pdf_file ? (
                          <>
                            {report.pdf_file.startsWith('pdf:') ? (
                              <button
                                onClick={() => viewPdfReport(report)}
                                className="inline-flex items-center gap-1 px-3 sm:px-4 py-2 bg-white hover:bg-green-50 text-green-600 border-2 border-green-600 text-xs sm:text-sm font-semibold rounded-lg shadow-md transition"
                              >
                                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                <span className="hidden sm:inline">View</span>
                              </button>
                            ) : (report.pdf_file.endsWith('.csv') || report.pdf_file.startsWith('db:csv:')) ? (
                              <button
                                onClick={() => viewCsvReport(report)}
                                className="inline-flex items-center gap-1 px-3 sm:px-4 py-2 bg-white hover:bg-green-50 text-green-600 border-2 border-green-600 text-xs sm:text-sm font-semibold rounded-lg shadow-md transition"
                              >
                                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                <span className="hidden sm:inline">View</span>
                              </button>
                            ) : (
                              <a
                                href={getViewUrl(report)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 sm:px-4 py-2 bg-white hover:bg-green-50 text-green-600 border-2 border-green-600 text-xs sm:text-sm font-semibold rounded-lg shadow-md transition"
                            >
                              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              <span className="hidden sm:inline">View</span>
                            </a>
                            )}
                            {report.status === 'approved' && report.pdf_file.startsWith('pdf:') && (
                              <button
                                onClick={async () => {
                                  try {
                                    // Generate and download PDF for feeding list
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
                                        const { generateFeedingListPDF } = await import('@/components/FeedingListPdfGenerator');
                                        const doc = generateFeedingListPDF(data.pdf_data);
                                        doc.save(`${report.title}.pdf`);
                                      } else {
                                        alert(`Error generating PDF: ${data.message || 'Unknown error'}`);
                                      }
                                    }
                                    // Generate and download PDF for monthly BMI
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
                                    console.error('Error downloading PDF:', error);
                                    alert('Error downloading PDF');
                                  }
                                }}
                                className="inline-flex items-center gap-1 px-3 sm:px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-md transition"
                              >
                                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                <span className="hidden sm:inline">Download</span>
                              </button>
                            )}
                            {report.status === 'approved' && (report.pdf_file.endsWith('.csv') || report.pdf_file.startsWith('db:csv:')) && (
                              <a
                                href={`/api/reports/download?file=${report.pdf_file?.split('/').pop() || ''}&report_id=${report.id}`}
                                className="inline-flex items-center gap-1 px-3 sm:px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-md transition"
                              >
                                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                <span className="hidden sm:inline">Download</span>
                              </a>
                            )}
                          </>
                        ) : (
                          <button
                            onClick={async (e) => {
                              // Try to generate PDF on-demand if it's a monthly BMI report
                              if (report.report_type === 'monthly_bmi' && report.data) {
                                viewPdfReport(report);
                              } else {
                                alert('Report file is not available yet. This report type may not support file generation.');
                              }
                            }}
                            className="inline-flex items-center gap-1 px-3 sm:px-4 py-2 bg-white hover:bg-green-50 text-green-600 border-2 border-green-600 text-xs sm:text-sm font-semibold rounded-lg shadow-md transition"
                          >
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span className="hidden sm:inline">View</span>
                          </button>
                        )}
                        {report.status !== 'approved' && (
                            <button
                              onClick={() => {
                                setSelectedReport(report);
                                setShowEditModal(true);
                              }}
                              className="inline-flex items-center gap-1 px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white border-2 border-blue-700 text-xs sm:text-sm font-semibold rounded-lg shadow-md transition"
                            >
                              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              <span className="hidden sm:inline">Edit</span>
                            </button>
                        )}
                            <button
                              onClick={() => handleDelete(report.id)}
                              className="inline-flex items-center gap-1 px-3 sm:px-4 py-2 bg-red-600 hover:bg-red-700 text-white border-2 border-red-700 text-xs sm:text-sm font-semibold rounded-lg shadow-md transition"
                            >
                              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              <span className="hidden sm:inline">Delete</span>
                            </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {reports.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                Showing <span className="font-medium text-slate-700">{startRecord}</span> to <span className="font-medium text-slate-700">{endRecord}</span> of <span className="font-medium text-slate-700">{reports.length}</span> reports
              </div>
              <div className="flex flex-wrap gap-1.5">
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
        </div>
      </main>

      {/* Generate Report Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between" style={{ background: '#1a3a6c' }}>
              <h3 className="text-sm font-bold text-white">Generate Report</h3>
              <button onClick={() => setShowGenerateModal(false)} className="text-white/70 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleGenerate} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Report Title *</label>
                <input
                  type="text"
                  name="title"
                  required
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Report Type *</label>
                <select
                  name="report_type"
                  required
                  onChange={(e) => {
                    const monthContainer = document.getElementById('monthFilterContainer');
                    const gradeLevelContainer = document.getElementById('gradeLevelContainer');
                    if (monthContainer) {
                      monthContainer.style.display = e.target.value === 'monthly_bmi' ? 'block' : 'none';
                    }
                    if (gradeLevelContainer) {
                      gradeLevelContainer.style.display = e.target.value === 'monthly_bmi' ? 'block' : 'none';
                    }
                  }}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select report type...</option>
                  <option value="monthly_bmi">Monthly BMI Report</option>
                  <option value="pre_post">List for Feeding</option>
                  <option value="overview">BMI and HFA Report</option>
                </select>
              </div>

              <div id="monthFilterContainer" style={{ display: 'none' }}>
                <label className="block text-xs font-medium text-slate-600 mb-1">Select Month *</label>
                <input
                  type="month"
                  name="report_month"
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div id="gradeLevelContainer" style={{ display: 'none' }}>
                <label className="block text-xs font-medium text-slate-600 mb-1">Grade Level *</label>
                <select
                  name="grade_level"
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select grade level...</option>
                  <option value="All levels">All levels</option>
                  <option value="Kinder">Kinder</option>
                  <option value="Grade 1">Grade 1</option>
                  <option value="Grade 2">Grade 2</option>
                  <option value="Grade 3">Grade 3</option>
                  <option value="Grade 4">Grade 4</option>
                  <option value="Grade 5">Grade 5</option>
                  <option value="Grade 6">Grade 6</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">School Name</label>
                <input
                  type="text"
                  name="school_name"
                  defaultValue="SCIENCE CITY OF MUNOZ"
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">School Year</label>
                <input
                  type="text"
                  name="school_year"
                  defaultValue="2025-2026"
                  placeholder="e.g., 2025-2026"
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">
                  {formError}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button type="submit" className="flex-1 text-sm text-white py-2 rounded-lg font-medium transition" style={{ background: '#1a3a6c' }}>
                  Submit Report
                </button>
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="flex-1 text-sm bg-slate-100 text-slate-700 py-2 rounded-lg hover:bg-slate-200 font-medium"
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
                  <option value="pre_post">List for Feeding</option>
                  <option value="overview">BMI and HFA Report</option>
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

      {/* CSV Viewer Modal */}
      {showCsvModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-bold">CSV Report: {selectedReport.title}</h3>
              <button
                onClick={() => {
                  setShowCsvModal(false);
                  setCsvData([]);
                  setCsvHeaders([]);
                  setSelectedReport(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-auto flex-1 p-4">
              <table className="min-w-full divide-y divide-gray-200 border-collapse">
                <thead className="bg-green-50 sticky top-0">
                  {/* Main header row */}
                  <tr>
                    {csvHeaders.map((header, idx) => {
                      // Check if this is a merged cell (empty after "Age")
                      const isMerged = header === '' && idx > 0 && csvHeaders[idx - 1] === 'Age';
                      const isAge = header === 'Age';
                      
                      if (isMerged) {
                        // Don't render merged cell
                        return null;
                      }
                      
                      // Check if next cell should be merged with this one
                      const shouldSpan = header === 'Age' && idx + 1 < csvHeaders.length && csvHeaders[idx + 1] === '';
                      
                      return (
                        <th
                          key={idx}
                          colSpan={shouldSpan ? 2 : 1}
                          className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-300"
                        >
                          {header}
                        </th>
                      );
                    })}
                  </tr>
                  {/* Sub-header row for Y and M */}
                  {csvHeaders.includes('Age') && (
                    <tr>
                      {csvHeaders.map((header, idx) => {
                        const isMerged = header === '' && idx > 0 && csvHeaders[idx - 1] === 'Age';
                        const isAge = header === 'Age';
                        
                        if (isMerged) {
                          return null;
                        }
                        
                        if (isAge) {
                          // Show Y and M sub-headers
                          return (
                            <>
                              <th
                                key={`${idx}-Y`}
                                className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider border border-gray-300 bg-green-100"
                              >
                                Y
                              </th>
                              <th
                                key={`${idx}-M`}
                                className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider border border-gray-300 bg-green-100"
                              >
                                M
                              </th>
                            </>
                          );
                        }
                        
                        return (
                          <th
                            key={idx}
                            className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider border border-gray-300 bg-green-100"
                          >
                            {/* Empty for non-Age columns in sub-header row */}
                          </th>
                        );
                      })}
                    </tr>
                  )}
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {csvData.map((row, rowIdx) => (
                    <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      {csvHeaders.map((header, headerIdx) => {
                        // Skip merged cells (empty cell after Age)
                        const isMerged = header === '' && headerIdx > 0 && csvHeaders[headerIdx - 1] === 'Age';
                        if (isMerged) return null;
                        
                        // If this is the Age column, show Y and M as separate cells
                        if (header === 'Age') {
                          const yValue = row[headerIdx] || '-';
                          const mValue = row[headerIdx + 1] !== undefined ? row[headerIdx + 1] : '-';
                          return (
                            <>
                              <td
                                key={`${rowIdx}-${headerIdx}-Y`}
                                className="px-4 py-2 text-sm text-gray-900 border border-gray-300 whitespace-nowrap"
                              >
                                {yValue}
                              </td>
                              <td
                                key={`${rowIdx}-${headerIdx}-M`}
                                className="px-4 py-2 text-sm text-gray-900 border border-gray-300 whitespace-nowrap"
                              >
                                {mValue}
                              </td>
                            </>
                          );
                        }
                        
                        // For other columns, show the cell data directly
                        const cellValue = row[headerIdx] || '-';
                        return (
                          <td
                            key={`${rowIdx}-${headerIdx}`}
                            className="px-4 py-2 text-sm text-gray-900 border border-gray-300 whitespace-nowrap"
                          >
                            {cellValue}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              {selectedReport.status !== 'approved' && (
                <p className="flex-1 text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-3 py-2 mr-2">
                  {selectedReport.status === 'rejected' ? '⛔ This report has been rejected and cannot be downloaded.' : '⏳ This report is pending review and cannot be downloaded yet.'}
                </p>
              )}
              {selectedReport.status === 'approved' && (
              <button
                onClick={async () => {
                  // Generate CSV download
                  let csvContent = '';
                  
                  // First, try to get CSV from database
                  if (selectedReport.pdf_file?.startsWith('db:csv:') && selectedReport.data) {
                    try {
                      const reportData = typeof selectedReport.data === 'string' 
                        ? JSON.parse(selectedReport.data) 
                        : selectedReport.data;
                      csvContent = reportData.csv_content || '';
                    } catch (e) {
                      console.error('Error parsing report data:', e);
                    }
                  }
                  
                  // If not in database, try to fetch from API
                  if (!csvContent) {
                    try {
                      const response = await fetch(
                        `/api/reports/view-csv?path=${encodeURIComponent(selectedReport.pdf_file || '')}&report_id=${selectedReport.id}`,
                        { credentials: 'include' }
                      );
                      if (response.ok) {
                        csvContent = await response.text();
                      } else {
                        // If API fails, try to generate CSV on-demand
                        if (selectedReport.report_type === 'monthly_bmi' && selectedReport.data) {
                          const reportData = typeof selectedReport.data === 'string' 
                            ? JSON.parse(selectedReport.data) 
                            : selectedReport.data;
                          const gradeLevel = reportData.grade_level;
                          const reportMonth = reportData.report_month;
                          
                          if (gradeLevel && reportMonth) {
                            const generateResponse = await fetch('/api/reports/generate-csv', {
                              method: 'POST',
                              credentials: 'include',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                report_id: selectedReport.id,
                                grade_level: gradeLevel,
                                report_month: reportMonth,
                              }),
                            });
                            
                            const generateData = await generateResponse.json();
                            if (generateData.success && generateData.csv_content) {
                              csvContent = generateData.csv_content;
                            }
                          }
                        }
                      }
                    } catch (error) {
                      console.error('Error fetching CSV:', error);
                    }
                  }
                  
                  // If we have CSV data from the modal, use it
                  if (!csvContent && csvData.length > 0) {
                    // Helper function to properly escape CSV fields
                    const escapeCsvField = (field: any): string => {
                      if (field === null || field === undefined) return '';
                      const str = String(field);
                      // If field contains comma, quote, newline, or has leading/trailing spaces, wrap in quotes
                      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.trim() !== str) {
                        return `"${str.replace(/"/g, '""')}"`;
                      }
                      return str;
                    };
                    
                    // Reconstruct CSV from displayed data with proper escaping
                    const headers = csvHeaders.map(escapeCsvField).join(',');
                    const rows = csvData.map(row => 
                      row.map(cell => escapeCsvField(cell)).join(',')
                    ).join('\n');
                    csvContent = headers + '\n' + rows;
                  }
                  
                  if (csvContent) {
                    // Create download
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    const url = URL.createObjectURL(blob);
                    link.setAttribute('href', url);
                    const filename = `${selectedReport.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
                    link.setAttribute('download', filename);
                    link.style.visibility = 'hidden';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                  } else {
                    alert('CSV content not available. Please try viewing the report first.');
                  }
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                Download CSV
              </button>
              )}
              <button
                onClick={() => {
                  setShowCsvModal(false);
                  setCsvData([]);
                  setCsvHeaders([]);
                  setSelectedReport(null);
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium"
              >
                Close
              </button>
            </div>
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
                      href={`/api/reports/download?file=${selectedReport.pdf_file?.split('/').pop() || ''}&report_id=${selectedReport.id}`}
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

      {/* PDF Viewer Modal */}
      {showPdfModal && selectedReport && pdfDataUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-7xl h-[95vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-bold">{selectedReport.title} - PDF Report</h3>
              <button
                onClick={() => {
                  setShowPdfModal(false);
                  setSelectedReport(null);
                  if (pdfDataUrl) {
                    URL.revokeObjectURL(pdfDataUrl);
                    setPdfDataUrl('');
                  }
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe
                src={`${pdfDataUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                className="w-full h-full"
                title="PDF Preview"
              />
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              {selectedReport.status === 'approved' ? (
                <a
                  href={pdfDataUrl}
                  download={`${selectedReport.title}.pdf`}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download PDF
                </a>
              ) : (
                <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-3 py-2 mr-auto">
                  {selectedReport.status === 'rejected'
                    ? '⛔ This report has been rejected and cannot be downloaded.'
                    : '⏳ This report is pending review. Download will be available once approved.'}
                </p>
              )}
              <button
                onClick={() => {
                  setShowPdfModal(false);
                  setSelectedReport(null);
                  if (pdfDataUrl) {
                    URL.revokeObjectURL(pdfDataUrl);
                    setPdfDataUrl('');
                  }
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
              {selectedReport.status !== 'approved' && (
                <p className={`text-sm rounded px-3 py-2 mr-auto border flex items-center gap-2 ${
                  selectedReport.status === 'rejected'
                    ? 'text-red-700 bg-red-50 border-red-200'
                    : 'text-yellow-700 bg-yellow-50 border-yellow-200'
                }`}>
                  {selectedReport.status === 'rejected'
                    ? '⛔ This report has been rejected and cannot be downloaded.'
                    : '⏳ This report is pending review. Download will be available once approved.'}
                </p>
              )}
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
            <th colSpan={2} className="border border-black px-2 py-1 text-center text-[10px] font-semibold bg-orange-100">Wasted</th>
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
            <th className="border border-black px-2 py-1 text-[10px] font-semibold bg-red-100">Severely Wasted</th>
            <th className="border border-black px-2 py-1 text-[10px] font-semibold bg-orange-100">Wasted</th>
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
    </div>
  );
}
