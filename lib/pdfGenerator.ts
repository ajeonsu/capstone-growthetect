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

interface PDFReportOptions {
  title: string;
  date: string;
  schoolName: string;
  schoolYear: string;
  gradeLevel: string;
  students: Student[];
  preparedBy: string;
}

export function generateBMIReportPDF(options: PDFReportOptions): jsPDF {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  
  // Set up fonts and styles
  doc.setFont('helvetica', 'bold');
  
  // Header
  doc.setFontSize(14);
  doc.text('NUTRITIONAL STATUS REPORT', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
  
  doc.setFontSize(16);
  doc.text(options.date, doc.internal.pageSize.getWidth() / 2, 23, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text(options.schoolName, doc.internal.pageSize.getWidth() / 2, 30, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(`Baseline SY ${options.schoolYear}`, doc.internal.pageSize.getWidth() / 2, 36, { align: 'center' });
  
  // Date of Weighing and Kinder info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Date of Weighing: ${options.date}`, 15, 45);
  doc.text(`Kinder: ${options.gradeLevel}`, doc.internal.pageSize.getWidth() - 60, 45);
  
  // Prepare table data
  const tableData = options.students.map((student, index) => [
    (index + 1).toString(),
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
  const stats = calculateStatistics(options.students);
  
  // Main table
  autoTable(doc, {
    startY: 50,
    head: [
      [
        { content: 'Names', rowSpan: 2 },
        { content: 'Birthday', rowSpan: 2 },
        { content: 'Weight\n(kg)', rowSpan: 2 },
        { content: 'Height\n(m)', rowSpan: 2 },
        { content: 'SEX', rowSpan: 2 },
        { content: 'Height2\n(m2)', rowSpan: 2 },
        { content: 'Age', colSpan: 2 },
        { content: 'BMI', rowSpan: 2 },
        { content: 'Nutritional Status', rowSpan: 2 },
        { content: 'Height-For-Age', rowSpan: 2 }
      ],
      ['', '', '', '', '', '', 'Y', 'M', '', '', '']
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
      fontSize: 8
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 2
    },
    columnStyles: {
      0: { cellWidth: 25 }, // Names
      1: { cellWidth: 20 }, // Birthday
      2: { cellWidth: 12 }, // Weight
      3: { cellWidth: 12 }, // Height
      4: { cellWidth: 8 },  // SEX
      5: { cellWidth: 12 }, // Height2
      6: { cellWidth: 8 },  // Y
      7: { cellWidth: 8 },  // M
      8: { cellWidth: 12 }, // BMI
      9: { cellWidth: 25 }, // Nutritional Status
      10: { cellWidth: 20 } // Height-For-Age
    },
    didDrawPage: function (data) {
      // Add page numbers
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }
  });
  
  // Get Y position after main table
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  
  // Statistics table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Body Mass Index', 15, finalY);
  
  autoTable(doc, {
    startY: finalY + 5,
    head: [['', 'M', 'F', 'T', 'HFA', 'M', 'F', 'TOTAL']],
    body: [
      ['No. of Cases', stats.male.total, stats.female.total, stats.total, 'No. of Cases', stats.male.total, stats.female.total, stats.total],
      ['Severely Wasted/SU', stats.male.severelyWasted, stats.female.severelyWasted, stats.severelyWasted, 'Sev. Stunted', stats.male.stunted, stats.female.stunted, stats.stunted],
      ['Wasted/U', stats.male.wasted, stats.female.wasted, stats.wasted, 'Stunted', stats.male.stunted, stats.female.stunted, stats.stunted],
      ['Normal', stats.male.normal, stats.female.normal, stats.normal, 'Normal', stats.male.normal, stats.female.normal, stats.normal],
      ['Overweight', stats.male.overweight, stats.female.overweight, stats.overweight, 'Tall', '0', '0', '0'],
      ['Obese', stats.male.obese, stats.female.obese, stats.obese, 'SS & S', stats.male.stunted, stats.female.stunted, stats.stunted],
      ['Severely Wasted/SU & Wasted/U', stats.male.totalWasted, stats.female.totalWasted, stats.totalWasted, 'SS/S not SW/W', stats.male.stunted, stats.female.stunted, stats.stunted]
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 9
    },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold' }
    }
  });
  
  // Prepared by
  const preparedByY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Prepared by:', doc.internal.pageSize.getWidth() - 80, preparedByY);
  doc.setFont('helvetica', 'bold');
  doc.text(options.preparedBy, doc.internal.pageSize.getWidth() - 80, preparedByY + 10);
  doc.setFont('helvetica', 'normal');
  doc.text('T-III', doc.internal.pageSize.getWidth() - 80, preparedByY + 16);
  
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
    stunted: students.filter(s => s.sex === 'M' && s.heightForAge === 'Stunted').length,
    totalWasted: 0
  };
  male.totalWasted = male.severelyWasted + male.wasted;
  
  const female = {
    total: students.filter(s => s.sex === 'F').length,
    severelyWasted: students.filter(s => s.sex === 'F' && s.nutritionalStatus.includes('Severely Wasted')).length,
    wasted: students.filter(s => s.sex === 'F' && s.nutritionalStatus.includes('Wasted') && !s.nutritionalStatus.includes('Severely')).length,
    normal: students.filter(s => s.sex === 'F' && s.nutritionalStatus === 'Normal').length,
    overweight: students.filter(s => s.sex === 'F' && s.nutritionalStatus === 'Overweight').length,
    obese: students.filter(s => s.sex === 'F' && s.nutritionalStatus === 'Obese').length,
    stunted: students.filter(s => s.sex === 'F' && s.heightForAge === 'Stunted').length,
    totalWasted: 0
  };
  female.totalWasted = female.severelyWasted + female.wasted;
  
  return {
    male,
    female,
    total: students.length,
    severelyWasted: male.severelyWasted + female.severelyWasted,
    wasted: male.wasted + female.wasted,
    normal: male.normal + female.normal,
    overweight: male.overweight + female.overweight,
    obese: male.obese + female.obese,
    stunted: male.stunted + female.stunted,
    totalWasted: male.totalWasted + female.totalWasted
  };
}
