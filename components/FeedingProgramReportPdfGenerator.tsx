import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useEffect } from 'react';

interface Beneficiary {
  name: string;
  grade: string;
  age: string | number;
  enrollmentDate: string;
  bmiAtEnrollment: string;
  bmiStatusAtEnrollment: string;
  currentBmi: string;
  currentBmiStatus: string;
  growthStatus?: string;
}

interface FeedingProgramReportPDFData {
  title: string;
  programName: string;
  startDate: string;
  endDate: string;
  description: string;
  schoolName: string;
  schoolYear: string;
  beneficiaries: Beneficiary[];
  totalBeneficiaries: number;
  preparedBy: string;
  isEnded?: boolean;
}

export function generateFeedingProgramReportPDF(pdfData: FeedingProgramReportPDFData): jsPDF {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Add logo (if available)
  try {
    const logoImg = new Image();
    logoImg.src = '/logo.png';
    doc.addImage(logoImg, 'PNG', 15, 8, 20, 20);
  } catch (error) {
    console.log('Logo not found, continuing without it');
  }

  // Header
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('FEEDING PROGRAM REPORT', pageWidth / 2, 15, { align: 'center' });

  // School info
  doc.setFontSize(11);
  doc.text(pdfData.schoolName, pageWidth / 2, 22, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`School Year ${pdfData.schoolYear}`, pageWidth / 2, 28, { align: 'center' });

  // Program details
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Program: ${pdfData.programName}`, 15, 38);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Period: ${pdfData.startDate} - ${pdfData.endDate}`, 15, 44);
  if (pdfData.description) {
    doc.text(`Description: ${pdfData.description}`, 15, 50);
  }
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Beneficiaries: ${pdfData.totalBeneficiaries}`, pageWidth - 80, 44);

  // Prepare table data
  const isEnded = pdfData.isEnded || false;
  const tableData = pdfData.beneficiaries.map((beneficiary) => {
    const row = [
      beneficiary.name,
      beneficiary.grade,
      beneficiary.age.toString(),
      beneficiary.enrollmentDate,
      `${beneficiary.bmiAtEnrollment}\n(${beneficiary.bmiStatusAtEnrollment})`,
      `${beneficiary.currentBmi}\n(${beneficiary.currentBmiStatus})`,
    ];
    if (isEnded) {
      row.push(beneficiary.growthStatus || 'N/A');
    }
    return row;
  });

  // Main table
  const startY = pdfData.description ? 56 : 50;
  
  // Prepare headers
  const headers: any[] = [
    { content: 'Name', styles: { halign: 'center' as const, valign: 'middle' as const } },
    { content: 'Grade', styles: { halign: 'center' as const, valign: 'middle' as const } },
    { content: 'Age', styles: { halign: 'center' as const, valign: 'middle' as const } },
    { content: 'Program Initiation', styles: { halign: 'center' as const, valign: 'middle' as const } },
    { content: 'Baseline BMI', styles: { halign: 'center' as const, valign: 'middle' as const } },
    { content: 'Current BMI', styles: { halign: 'center' as const, valign: 'middle' as const } },
  ];
  
  if (isEnded) {
    headers.push({ content: 'Growth', styles: { halign: 'center' as const, valign: 'middle' as const } });
  }

  // Column styles
  const columnStyles: any = {
    0: { cellWidth: 50 }, // Name
    1: { cellWidth: 25 }, // Grade
    2: { cellWidth: 15 }, // Age
    3: { cellWidth: 28 }, // Enrolled
    4: { cellWidth: 40, halign: 'center' }, // Baseline BMI
    5: { cellWidth: 40, halign: 'center' }, // Current BMI
  };
  
  if (isEnded) {
    columnStyles[6] = { cellWidth: 30, halign: 'center' }; // Growth
  }

  autoTable(doc, {
    startY: startY,
    head: [headers],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.5,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 2,
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
    },
    columnStyles: columnStyles,
    didDrawPage: function (data) {
      // Add page numbers
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: 'center' }
      );
    },
  });

  // Get Y position after main table
  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // Prepared by section
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Prepared by:', pageWidth - 80, finalY);
  doc.setFont('helvetica', 'bold');
  doc.text(pdfData.preparedBy, pageWidth - 80, finalY + 8);
  doc.setFont('helvetica', 'normal');
  doc.text('Nutritionist', pageWidth - 80, finalY + 14);

  return doc;
}

export default function FeedingProgramReportPdfGenerator() {
  useEffect(() => {
    // Listen for PDF download events for feeding program reports
    const handleDownload = (event: any) => {
      const pdfData = event.detail;
      if (pdfData && pdfData.isFeedingProgramReport) {
        const doc = generateFeedingProgramReportPDF(pdfData);
        doc.save(`${pdfData.title || 'feeding-program-report'}.pdf`);
      }
    };

    window.addEventListener('downloadFeedingProgramReportPdf', handleDownload);

    return () => {
      window.removeEventListener('downloadFeedingProgramReportPdf', handleDownload);
    };
  }, []);

  return null; // This is a utility component, no UI
}
