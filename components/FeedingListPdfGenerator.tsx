import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useEffect } from 'react';

interface Student {
  id: number;
  name: string;
  birthday: string;
  weight: number;
  height: number;
  sex: 'M' | 'F' | '';
  height2: number;
  ageYears: number;
  ageMonths: number;
  bmi: number;
  nutritionalStatus: string;
  heightForAge: string;
  gradeSection: string;
}

interface FeedingListPDFData {
  title: string;
  date: string;
  schoolName: string;
  schoolYear: string;
  students: Student[];
  preparedBy: string;
}

export function generateFeedingListPDF(pdfData: FeedingListPDFData): jsPDF {
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
    // Position logo on the left side of the header
    doc.addImage(logoImg, 'PNG', 15, 8, 20, 20);
  } catch (error) {
    console.log('Logo not found, continuing without it');
  }

  // Header - Title centered at top
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('NUTRITIONAL STATUS REPORT', pageWidth / 2, 15, { align: 'center' });
  
  // Date below title
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const formattedDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const dateStr = formattedDate.toUpperCase();
  doc.text(dateStr, pageWidth / 2, 22, { align: 'center' });

  // School info
  doc.setFont('helvetica', 'bold');
  doc.text(pdfData.schoolName, pageWidth / 2, 28, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(`Baseline SY ${pdfData.schoolYear}`, pageWidth / 2, 34, { align: 'center' });

  // Date of Weighing
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Date of Weighing: ${formattedDate}`, 15, 42);

  // Prepare table data
  const tableData = pdfData.students.map((student) => [
    student.name,
    student.birthday,
    student.weight.toFixed(1),
    student.height.toFixed(2),
    student.sex,
    student.height2.toFixed(4),
    student.ageYears.toString(),
    student.ageMonths.toString(),
    student.bmi.toFixed(1),
    student.nutritionalStatus,
    student.heightForAge,
    student.gradeSection,
  ]);

  // Main table with custom headers
  autoTable(doc, {
    startY: 48,
    head: [
      [
        { content: 'Names', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'Birthday\nmm/dd/yy or\ndd/mm/yr', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fontSize: 6 } },
        { content: 'Weight\n(kg)', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'Height\n(meters)', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'Sex', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'Height²\n(m²)', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fontSize: 7 } },
        { content: 'Age', colSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'Body Mass\nIndex', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'Nutritional status', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'Height For Age Status', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'Grade & Section', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }
      ],
      [
        { content: 'Y', styles: { halign: 'center', valign: 'middle' } },
        { content: 'M', styles: { halign: 'center', valign: 'middle' } }
      ]
    ],
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
      fontSize: 7,
    },
    bodyStyles: {
      fontSize: 7,
      cellPadding: 1.5,
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
    },
    columnStyles: {
      0: { cellWidth: 40 }, // Names
      1: { cellWidth: 20 }, // Birthday
      2: { cellWidth: 15 }, // Weight
      3: { cellWidth: 15 }, // Height
      4: { cellWidth: 10 }, // SEX
      5: { cellWidth: 15 }, // Height2
      6: { cellWidth: 10 }, // Y
      7: { cellWidth: 10 }, // M
      8: { cellWidth: 15 }, // BMI
      9: { cellWidth: 30 }, // Nutritional Status
      10: { cellWidth: 30 }, // Height-For-Age
      11: { cellWidth: 25 }, // Grade & Section
    },
    didDrawPage: function (data) {
      // Add page numbers
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(`Page ${data.pageNumber} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
    },
  });

  // Get Y position after main table
  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // Summary info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`Total Students for Feeding Program: ${pdfData.students.length}`, 15, finalY);

  // Prepared by section
  const preparedByY = finalY + 15;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Prepared by:', pageWidth - 80, preparedByY);
  doc.setFont('helvetica', 'bold');
  doc.text(pdfData.preparedBy, pageWidth - 80, preparedByY + 8);
  doc.setFont('helvetica', 'normal');
  doc.text('T-III', pageWidth - 80, preparedByY + 14);

  return doc;
}

export default function FeedingListPdfGenerator() {
  useEffect(() => {
    // Listen for PDF download events for feeding list
    const handleDownload = (event: any) => {
      const pdfData = event.detail;
      if (pdfData && pdfData.isFeedingList) {
        const doc = generateFeedingListPDF(pdfData);
        doc.save(`${pdfData.title || 'feeding-list'}.pdf`);
      }
    };

    window.addEventListener('downloadFeedingListPdf', handleDownload);

    return () => {
      window.removeEventListener('downloadFeedingListPdf', handleDownload);
    };
  }, []);

  return null; // This is a utility component, no UI
}
