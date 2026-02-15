'use client';

import { useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Student {
  name: string;
  birthday: string;
  weight: number;
  height: number;
  sex: string;
  height2: number;
  ageYears: number;
  ageMonths: number;
  bmi: number;
  nutritionalStatus: string;
  heightForAge: string;
}

interface PDFData {
  title: string;
  date: string;
  schoolName: string;
  schoolYear: string;
  gradeLevel: string;
  students: Student[];
  preparedBy: string;
  allGradeData?: Array<{
    gradeLevel: string;
    students: Student[];
  }>;
}

function generateAllLevelsPDF(pdfData: PDFData): jsPDF {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  
  console.log('[PDF GENERATOR] Generating All Levels PDF');
  console.log('[PDF GENERATOR] allGradeData length:', pdfData.allGradeData?.length);
  console.log('[PDF GENERATOR] Students per grade:', pdfData.allGradeData?.map(g => ({ grade: g.gradeLevel, count: g.students?.length })));
  
  // Generate a page for each grade level
  pdfData.allGradeData?.forEach((gradeData, index) => {
    if (index > 0) {
      doc.addPage();
    }
    
    // Add logo (if available)
    try {
      const logoImg = new Image();
      logoImg.src = '/logo.png';
      doc.addImage(logoImg, 'PNG', 15, 8, 20, 20);
    } catch (error) {
      console.log('Logo not found, continuing without it');
    }
    
    // Set up fonts and styles
    doc.setFont('helvetica', 'bold');
    
    // Header
    doc.setFontSize(14);
    doc.text('NUTRITIONAL STATUS REPORT', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(pdfData.date, doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });
    
    doc.setFontSize(11);
    doc.text(pdfData.schoolName, doc.internal.pageSize.getWidth() / 2, 28, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text(`Baseline SY ${pdfData.schoolYear}`, doc.internal.pageSize.getWidth() / 2, 34, { align: 'center' });
    
    // Date of Weighing and Grade info
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Date of Weighing: ${pdfData.date}`, 15, 42);
    doc.text(`Grade Level: ${gradeData.gradeLevel}`, doc.internal.pageSize.getWidth() - 60, 42);
    
    console.log(`[PDF GENERATOR] Processing ${gradeData.gradeLevel}: ${gradeData.students?.length || 0} students`);
    
    // Prepare table data
    const tableData = gradeData.students.map((student) => [
      student.name,
      student.birthday,
      student.weight.toString(),
      student.height.toFixed(2),
      student.sex,
      student.height2.toFixed(4),
      student.ageYears.toString(),
      student.ageMonths.toString(),
      student.bmi.toFixed(1),
      student.nutritionalStatus,
      student.heightForAge
    ]);
    
    // Calculate statistics for this grade
    const stats = calculateStatistics(gradeData.students);
    
    // Main table with custom headers
    autoTable(doc, {
      startY: 46,
      head: [
        [
          { content: 'Names', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Birthday', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Weight\n(kg)', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Height\n(m)', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'SEX', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Height2\n(m2)', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Age', colSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'BMI', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Nutritional\nStatus', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Height-For-Age', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }
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
        fontSize: 7
      },
      bodyStyles: {
        fontSize: 7,
        cellPadding: 1.5,
        lineColor: [0, 0, 0],
        lineWidth: 0.3
      },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 22 },
        2: { cellWidth: 18 },
        3: { cellWidth: 18 },
        4: { cellWidth: 12 },
        5: { cellWidth: 18 },
        6: { cellWidth: 12 },
        7: { cellWidth: 12 },
        8: { cellWidth: 15 },
        9: { cellWidth: 35 },
        10: { cellWidth: 30 }
      },
      didDrawPage: function (data) {
        // Add page numbers
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(
          `Page ${data.pageNumber} of ${pageCount}`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 8,
          { align: 'center' }
        );
      }
    });
    
    // Get Y position after main table
    const finalY = (doc as any).lastAutoTable.finalY + 8;
    
    // Statistics table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Body Mass Index Summary', 15, finalY);
    
    // Combined table with BMI and HFA sections
    autoTable(doc, {
      startY: finalY + 4,
      head: [['Body Mass Index', 'M', 'F', 'T', 'HFA', 'M', 'F', 'TOTAL']],
      body: [
        ['No. of Cases', stats.male.total.toString(), stats.female.total.toString(), stats.total.toString(), 'No. of Cases', stats.male.total.toString(), stats.female.total.toString(), stats.total.toString()],
        ['Severely Wasted/SU', stats.male.severelyWasted.toString(), stats.female.severelyWasted.toString(), stats.severelyWasted.toString(), 'Sev. Stunted', stats.male.sevStunted.toString(), stats.female.sevStunted.toString(), stats.sevStunted.toString()],
        ['Wasted/U', stats.male.wasted.toString(), stats.female.wasted.toString(), stats.wasted.toString(), 'Stunted', stats.male.stunted.toString(), stats.female.stunted.toString(), stats.stunted.toString()],
        ['Normal', stats.male.normal.toString(), stats.female.normal.toString(), stats.normal.toString(), 'Normal', stats.male.normalHeight.toString(), stats.female.normalHeight.toString(), stats.normalHeight.toString()],
        ['Overweight', stats.male.overweight.toString(), stats.female.overweight.toString(), stats.overweight.toString(), 'Tall', stats.male.tall.toString(), stats.female.tall.toString(), stats.tall.toString()],
        ['Obese', stats.male.obese.toString(), stats.female.obese.toString(), stats.obese.toString(), 'SS & S', stats.male.totalStunted.toString(), stats.female.totalStunted.toString(), stats.totalStunted.toString()],
        ['Severely Wasted/SU & Wasted/U', stats.male.totalWasted.toString(), stats.female.totalWasted.toString(), stats.totalWasted.toString(), 'SS/S not SW/W', stats.male.stuntedNotWasted.toString(), stats.female.stuntedNotWasted.toString(), stats.stuntedNotWasted.toString()],
      ],
      theme: 'grid',
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 8
      },
      bodyStyles: {
        fontSize: 8,
        lineColor: [0, 0, 0],
        lineWidth: 0.3
      },
      columnStyles: {
        0: { halign: 'left', fontStyle: 'bold', cellWidth: 45 },
        1: { halign: 'center', cellWidth: 18 },
        2: { halign: 'center', cellWidth: 18 },
        3: { halign: 'center', cellWidth: 18 },
        4: { halign: 'left', fontStyle: 'bold', cellWidth: 35 },
        5: { halign: 'center', cellWidth: 18 },
        6: { halign: 'center', cellWidth: 18 },
        7: { halign: 'center', cellWidth: 18 }
      }
    });
    
    // Prepared by
    const preparedByY = (doc as any).lastAutoTable.finalY + 12;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Prepared by:', doc.internal.pageSize.getWidth() - 80, preparedByY);
    doc.setFont('helvetica', 'bold');
    doc.text(pdfData.preparedBy, doc.internal.pageSize.getWidth() - 80, preparedByY + 8);
    doc.setFont('helvetica', 'normal');
    doc.text('T-III', doc.internal.pageSize.getWidth() - 80, preparedByY + 14);
  });
  
  return doc;
}

export function generatePDF(pdfData: PDFData): jsPDF {
  // If allGradeData exists, generate multi-page PDF for all grades
  if (pdfData.allGradeData && pdfData.allGradeData.length > 0) {
    return generateAllLevelsPDF(pdfData);
  }

  const doc = new jsPDF('landscape', 'mm', 'a4'); // Landscape for more columns
  
  // Add logo (if available)
  try {
    const logoImg = new Image();
    logoImg.src = '/logo.png';
    // Position logo on the left side of the header
    doc.addImage(logoImg, 'PNG', 15, 8, 20, 20);
  } catch (error) {
    console.log('Logo not found, continuing without it');
  }
  
  // Set up fonts and styles
  doc.setFont('helvetica', 'bold');
  
  // Header - adjusted to account for logo
  doc.setFontSize(14);
  doc.text('NUTRITIONAL STATUS REPORT', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text(pdfData.date, doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });
  
  doc.setFontSize(11);
  doc.text(pdfData.schoolName, doc.internal.pageSize.getWidth() / 2, 28, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(`Baseline SY ${pdfData.schoolYear}`, doc.internal.pageSize.getWidth() / 2, 34, { align: 'center' });
  
  // Date of Weighing and Grade info
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Date of Weighing: ${pdfData.date}`, 15, 42);
  doc.text(`Grade Level: ${pdfData.gradeLevel}`, doc.internal.pageSize.getWidth() - 60, 42);
  
  // Prepare table data
  const tableData = pdfData.students.map((student) => [
    student.name,
    student.birthday,
    student.weight.toString(),
    student.height.toFixed(2),
    student.sex,
    student.height2.toFixed(4),
    student.ageYears.toString(),
    student.ageMonths.toString(),
    student.bmi.toFixed(1),
    student.nutritionalStatus,
    student.heightForAge
  ]);
  
  // Calculate statistics
  const stats = calculateStatistics(pdfData.students);
  
  // Main table with custom headers
  autoTable(doc, {
    startY: 46,
    head: [
      [
        { content: 'Names', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'Birthday', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'Weight\n(kg)', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'Height\n(m)', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'SEX', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'Height2\n(m2)', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'Age', colSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'BMI', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'Nutritional\nStatus', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'Height-For-Age', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }
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
      fontSize: 7
    },
    bodyStyles: {
      fontSize: 7,
      cellPadding: 1.5,
      lineColor: [0, 0, 0],
      lineWidth: 0.3
    },
    columnStyles: {
      0: { cellWidth: 45 }, // Names (expanded)
      1: { cellWidth: 22 }, // Birthday (expanded)
      2: { cellWidth: 18 }, // Weight (expanded)
      3: { cellWidth: 18 }, // Height (expanded)
      4: { cellWidth: 12 },  // SEX (expanded)
      5: { cellWidth: 18 }, // Height2 (expanded)
      6: { cellWidth: 12 },  // Y (expanded)
      7: { cellWidth: 12 },  // M (expanded)
      8: { cellWidth: 15 }, // BMI (expanded)
      9: { cellWidth: 35 }, // Nutritional Status (expanded)
      10: { cellWidth: 30 } // Height-For-Age (expanded)
    },
    didDrawPage: function (data) {
      // Add page numbers
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: 'center' }
      );
    }
  });
  
  // Get Y position after main table
  const finalY = (doc as any).lastAutoTable.finalY + 8;
  
  // Statistics table - Two sections side by side
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Body Mass Index Summary', 15, finalY);
  
  // Combined table with BMI and HFA sections
  autoTable(doc, {
    startY: finalY + 4,
    head: [['Body Mass Index', 'M', 'F', 'T', 'HFA', 'M', 'F', 'TOTAL']],
    body: [
      ['No. of Cases', stats.male.total.toString(), stats.female.total.toString(), stats.total.toString(), 'No. of Cases', stats.male.total.toString(), stats.female.total.toString(), stats.total.toString()],
      ['Severely Wasted/SU', stats.male.severelyWasted.toString(), stats.female.severelyWasted.toString(), stats.severelyWasted.toString(), 'Sev. Stunted', stats.male.sevStunted.toString(), stats.female.sevStunted.toString(), stats.sevStunted.toString()],
      ['Wasted/U', stats.male.wasted.toString(), stats.female.wasted.toString(), stats.wasted.toString(), 'Stunted', stats.male.stunted.toString(), stats.female.stunted.toString(), stats.stunted.toString()],
      ['Normal', stats.male.normal.toString(), stats.female.normal.toString(), stats.normal.toString(), 'Normal', stats.male.normalHeight.toString(), stats.female.normalHeight.toString(), stats.normalHeight.toString()],
      ['Overweight', stats.male.overweight.toString(), stats.female.overweight.toString(), stats.overweight.toString(), 'Tall', stats.male.tall.toString(), stats.female.tall.toString(), stats.tall.toString()],
      ['Obese', stats.male.obese.toString(), stats.female.obese.toString(), stats.obese.toString(), 'SS & S', stats.male.totalStunted.toString(), stats.female.totalStunted.toString(), stats.totalStunted.toString()],
      ['Severely Wasted/SU & Wasted/U', stats.male.totalWasted.toString(), stats.female.totalWasted.toString(), stats.totalWasted.toString(), 'SS/S not SW/W', stats.male.stuntedNotWasted.toString(), stats.female.stuntedNotWasted.toString(), stats.stuntedNotWasted.toString()],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 8
    },
    bodyStyles: {
      fontSize: 8,
      lineColor: [0, 0, 0],
      lineWidth: 0.3
    },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold', cellWidth: 45 }, // BMI Category
      1: { halign: 'center', cellWidth: 18 }, // M
      2: { halign: 'center', cellWidth: 18 }, // F
      3: { halign: 'center', cellWidth: 18 }, // T
      4: { halign: 'left', fontStyle: 'bold', cellWidth: 35 }, // HFA Category
      5: { halign: 'center', cellWidth: 18 }, // M
      6: { halign: 'center', cellWidth: 18 }, // F
      7: { halign: 'center', cellWidth: 18 }  // TOTAL
    }
  });
  
  // Prepared by
  const preparedByY = (doc as any).lastAutoTable.finalY + 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Prepared by:', doc.internal.pageSize.getWidth() - 80, preparedByY);
  doc.setFont('helvetica', 'bold');
  doc.text(pdfData.preparedBy, doc.internal.pageSize.getWidth() - 80, preparedByY + 8);
  doc.setFont('helvetica', 'normal');
  doc.text('T-III', doc.internal.pageSize.getWidth() - 80, preparedByY + 14);
  
  return doc;
}

function calculateStatistics(students: Student[]) {
  const male = {
    total: students.filter(s => s.sex === 'M').length,
    severelyWasted: students.filter(s => s.sex === 'M' && s.nutritionalStatus.includes('Severely Wasted')).length,
    wasted: students.filter(s => s.sex === 'M' && s.nutritionalStatus.includes('Wasted') && !s.nutritionalStatus.includes('Severely')).length,
    normal: students.filter(s => s.sex === 'M' && s.nutritionalStatus === 'Normal').length,
    overweight: students.filter(s => s.sex === 'M' && s.nutritionalStatus === 'Overweight').length,
    obese: students.filter(s => s.sex === 'M' && s.nutritionalStatus === 'Obese').length,
    totalWasted: 0,
    // Height-For-Age stats
    sevStunted: students.filter(s => s.sex === 'M' && s.heightForAge === 'Severely Stunted').length,
    stunted: students.filter(s => s.sex === 'M' && s.heightForAge === 'Stunted').length,
    normalHeight: students.filter(s => s.sex === 'M' && s.heightForAge === 'Normal').length,
    tall: students.filter(s => s.sex === 'M' && s.heightForAge === 'Tall').length,
    totalStunted: 0,
    stuntedNotWasted: 0,
  };
  male.totalWasted = male.severelyWasted + male.wasted;
  male.totalStunted = male.sevStunted + male.stunted;
  male.stuntedNotWasted = male.totalStunted - male.totalWasted;
  
  const female = {
    total: students.filter(s => s.sex === 'F').length,
    severelyWasted: students.filter(s => s.sex === 'F' && s.nutritionalStatus.includes('Severely Wasted')).length,
    wasted: students.filter(s => s.sex === 'F' && s.nutritionalStatus.includes('Wasted') && !s.nutritionalStatus.includes('Severely')).length,
    normal: students.filter(s => s.sex === 'F' && s.nutritionalStatus === 'Normal').length,
    overweight: students.filter(s => s.sex === 'F' && s.nutritionalStatus === 'Overweight').length,
    obese: students.filter(s => s.sex === 'F' && s.nutritionalStatus === 'Obese').length,
    totalWasted: 0,
    // Height-For-Age stats
    sevStunted: students.filter(s => s.sex === 'F' && s.heightForAge === 'Severely Stunted').length,
    stunted: students.filter(s => s.sex === 'F' && s.heightForAge === 'Stunted').length,
    normalHeight: students.filter(s => s.sex === 'F' && s.heightForAge === 'Normal').length,
    tall: students.filter(s => s.sex === 'F' && s.heightForAge === 'Tall').length,
    totalStunted: 0,
    stuntedNotWasted: 0,
  };
  female.totalWasted = female.severelyWasted + female.wasted;
  female.totalStunted = female.sevStunted + female.stunted;
  female.stuntedNotWasted = female.totalStunted - female.totalWasted;
  
  return {
    male,
    female,
    total: students.length,
    severelyWasted: male.severelyWasted + female.severelyWasted,
    wasted: male.wasted + female.wasted,
    normal: male.normal + female.normal,
    overweight: male.overweight + female.overweight,
    obese: male.obese + female.obese,
    totalWasted: male.totalWasted + female.totalWasted,
    // Height-For-Age totals
    sevStunted: male.sevStunted + female.sevStunted,
    stunted: male.stunted + female.stunted,
    normalHeight: male.normalHeight + female.normalHeight,
    tall: male.tall + female.tall,
    totalStunted: male.totalStunted + female.totalStunted,
    stuntedNotWasted: male.stuntedNotWasted + female.stuntedNotWasted,
  };
}

export default function PdfGenerator() {
  useEffect(() => {
    // Listen for PDF download events
    const handleDownload = (event: any) => {
      const pdfData = event.detail;
      if (pdfData) {
        const doc = generatePDF(pdfData);
        doc.save(`${pdfData.title || 'report'}.pdf`);
      }
    };
    
    window.addEventListener('downloadPdf', handleDownload);
    
    return () => {
      window.removeEventListener('downloadPdf', handleDownload);
    };
  }, []);
  
  return null; // This is a utility component, no UI
}
