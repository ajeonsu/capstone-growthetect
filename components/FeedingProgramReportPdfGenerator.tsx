import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useEffect } from 'react';

interface Beneficiary {
  name: string;
  grade: string;
  age: string | number;
  feedingStartDate: string;
  feedingEndDate: string;
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
  attendance_image_base64?: string | null;
  proof_images_base64?: string[];
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
  const tableData = pdfData.beneficiaries.map((beneficiary, index) => [
    (index + 1).toString(),
    beneficiary.name,
    beneficiary.grade,
    beneficiary.age.toString(),
    beneficiary.feedingStartDate || 'N/A',
    beneficiary.feedingEndDate || 'N/A',
    `${beneficiary.bmiAtEnrollment}\n(${beneficiary.bmiStatusAtEnrollment})`,
    `${beneficiary.currentBmi}\n(${beneficiary.currentBmiStatus})`,
    beneficiary.growthStatus || 'N/A',
  ]);

  // Main table
  const startY = pdfData.description ? 56 : 50;

  // Prepare headers
  const headers: any[] = [
    { content: '#', styles: { halign: 'center' as const, valign: 'middle' as const } },
    { content: 'Name', styles: { halign: 'center' as const, valign: 'middle' as const } },
    { content: 'Grade', styles: { halign: 'center' as const, valign: 'middle' as const } },
    { content: 'Age', styles: { halign: 'center' as const, valign: 'middle' as const } },
    { content: 'Feeding Start Date', styles: { halign: 'center' as const, valign: 'middle' as const } },
    { content: 'Feeding End Date', styles: { halign: 'center' as const, valign: 'middle' as const } },
    { content: 'Baseline BMI', styles: { halign: 'center' as const, valign: 'middle' as const } },
    { content: 'Current BMI', styles: { halign: 'center' as const, valign: 'middle' as const } },
    { content: 'Growth', styles: { halign: 'center' as const, valign: 'middle' as const } },
  ];

  // Column styles
  const columnStyles: any = {
    0: { cellWidth: 8, halign: 'center' },  // #
    1: { cellWidth: 50 }, // Name
    2: { cellWidth: 25 }, // Grade
    3: { cellWidth: 15 }, // Age
    4: { cellWidth: 25, halign: 'center' }, // Feeding Start Date
    5: { cellWidth: 25, halign: 'center' }, // Feeding End Date
    6: { cellWidth: 32, halign: 'center' }, // Baseline BMI
    7: { cellWidth: 32, halign: 'center' }, // Current BMI
    8: { cellWidth: 28, halign: 'center' }, // Growth
  };

  autoTable(doc, {
    startY: startY,
    head: [headers],
    body: tableData,
    theme: 'grid',
    rowPageBreak: 'avoid',
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
      overflow: 'linebreak',
      valign: 'middle',
    },
    columnStyles: columnStyles,
    didParseCell: function (data: any) {
      if (data.section === 'body' && data.column.index === 8) {
        const val = data.cell.raw as string;
        if (val === 'Recovered') {
          data.cell.styles.textColor = [21, 128, 61];
          data.cell.styles.fontStyle = 'bold';
        } else if (val === 'Improved') {
          data.cell.styles.textColor = [22, 101, 52];
        } else if (val === 'Maintained') {
          data.cell.styles.textColor = [180, 83, 9];
        } else if (val === 'Not Improved') {
          data.cell.styles.textColor = [185, 28, 28];
          data.cell.styles.fontStyle = 'bold';
        } else if (val === 'Overdone') {
          data.cell.styles.textColor = [126, 34, 206];
        }
      }
    },
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

  // Collect all proof/attendance images (new array format + legacy single field)
  const allProofImages: string[] = [
    ...(pdfData.proof_images_base64 || []),
    ...(pdfData.attendance_image_base64 && !(pdfData.proof_images_base64?.length) ? [pdfData.attendance_image_base64] : []),
  ];

  // Add each proof image on its own page
  allProofImages.forEach((base64, idx) => {
    doc.addPage();
    const pageH = doc.internal.pageSize.getHeight();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    const headerLabel = allProofImages.length > 1 ? `PROOF OF DOCUMENTATION (${idx + 1} of ${allProofImages.length})` : 'PROOF OF DOCUMENTATION';
    doc.text(headerLabel, pageWidth / 2, 15, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(pdfData.programName, pageWidth / 2, 21, { align: 'center' });
    doc.setDrawColor(180, 180, 180);
    doc.line(15, 25, pageWidth - 15, 25);

    let imgFormat: 'JPEG' | 'PNG' | 'WEBP' = 'JPEG';
    if (base64.startsWith('data:image/png')) imgFormat = 'PNG';
    else if (base64.startsWith('data:image/webp')) imgFormat = 'WEBP';

    const maxW = pageWidth - 30;
    const maxH = pageH - 40;

    try {
      const imgProps = doc.getImageProperties(base64);
      const ratio = Math.min(maxW / imgProps.width, maxH / imgProps.height);
      const drawW = imgProps.width * ratio;
      const drawH = imgProps.height * ratio;
      const x = (pageWidth - drawW) / 2;
      doc.addImage(base64, imgFormat, x, 28, drawW, drawH);
    } catch {
      doc.addImage(base64, imgFormat, 15, 28, maxW, maxH);
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(
      `Page ${doc.getNumberOfPages()} of ${doc.getNumberOfPages()}`,
      pageWidth / 2,
      pageH - 8,
      { align: 'center' }
    );
  });

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
