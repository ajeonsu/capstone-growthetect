import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/db';
import { requireAuth, getCurrentUser } from '@/lib/auth';
import { calculateBMI, getBMIStatus } from '@/lib/helpers';

// POST - Generate PDF report on-demand
export async function POST(request: NextRequest) {
  try {
    await requireAuth(request);
    const user = await getCurrentUser(request);
    if (!user) throw new Error('Unauthorized');

    const supabase = getSupabaseClient();
    const body = await request.json();
    const { report_id, grade_level, report_month, school_name, school_year } = body;

    if (!grade_level || !report_month) {
      return NextResponse.json(
        { success: false, message: 'Grade level and report month are required' },
        { status: 400 }
      );
    }

    console.log('[GENERATE PDF] Starting PDF generation for:', { grade_level, report_month });

    // Generate PDF data
    const pdfData = await generatePDFReportData(
      supabase,
      grade_level,
      report_month,
      school_name || 'SCIENCE CITY OF MUNOZ',
      school_year || '2025-2026',
      user.name
    );

    // Store PDF generation info in report if report_id is provided
    if (report_id) {
      const { data: currentReport } = await supabase
        .from('reports')
        .select('data')
        .eq('id', report_id)
        .single();

      let updatedData = currentReport?.data
        ? typeof currentReport.data === 'string'
          ? JSON.parse(currentReport.data)
          : currentReport.data
        : {};

      updatedData.pdf_data = pdfData;
      updatedData.school_name = school_name;
      updatedData.school_year = school_year;

      await supabase
        .from('reports')
        .update({
          data: JSON.stringify(updatedData),
          pdf_file: `pdf:${Date.now()}:${Math.random().toString(36).substring(2, 9)}`,
        })
        .eq('id', report_id);
    }

    return NextResponse.json({
      success: true,
      pdf_data: pdfData,
      message: 'PDF data generated successfully',
    });
  } catch (error: any) {
    console.error('[GENERATE PDF] Error:', error);
    return NextResponse.json(
      { success: false, message: 'Error generating PDF', error: error?.message },
      { status: 500 }
    );
  }
}

// Helper function to generate PDF report data
async function generatePDFReportData(
  supabase: any,
  gradeLevel: string,
  reportMonth: string,
  schoolName: string,
  schoolYear: string,
  preparedBy: string
) {
  // Map grade level to database format
  const gradeMap: Record<string, number> = {
    Kinder: 0,
    'Grade 1': 1,
    'Grade 2': 2,
    'Grade 3': 3,
    'Grade 4': 4,
    'Grade 5': 5,
    'Grade 6': 6,
  };
  const dbGradeLevel = gradeMap[gradeLevel];

  if (dbGradeLevel === undefined) {
    throw new Error(`Invalid grade level: ${gradeLevel}`);
  }

  // Parse month (format: YYYY-MM)
  const [year, month] = reportMonth.split('-');
  const monthStart = `${year}-${month}-01`;
  const monthEnd = `${year}-${month}-31`;

  // Format date for display
  const date = new Date(reportMonth + '-15');
  const formattedDate = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Fetch students by grade level
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('*')
    .eq('grade_level', dbGradeLevel);

  if (studentsError || !students) {
    throw new Error('Error fetching students');
  }

  // Fetch BMI records for the month
  const { data: bmiRecords, error: bmiError } = await supabase
    .from('bmi_records')
    .select('*')
    .gte('measured_at', monthStart)
    .lte('measured_at', monthEnd)
    .order('measured_at', { ascending: false });

  if (bmiError) {
    throw new Error('Error fetching BMI records');
  }

  // Create a map of student_id to latest BMI record for the month
  const latestRecords = new Map();
  bmiRecords?.forEach((record: any) => {
    const studentId = record.student_id;
    const existing = latestRecords.get(studentId);
    if (!existing || new Date(record.measured_at) > new Date(existing.measured_at)) {
      latestRecords.set(studentId, record);
    }
  });

  // Process student data
  const studentData = students.map((student: any) => {
    const record = latestRecords.get(student.id);

    // Get student name
    const lastName = (student.last_name || '').trim();
    const firstName = (student.first_name || '').trim();
    const middleName = (student.middle_name || '').trim();
    
    let fullName = '';
    if (lastName && firstName) {
      fullName = `${lastName}, ${firstName}${middleName ? ' ' + middleName : ''}`;
    } else if (firstName) {
      fullName = `${firstName}${middleName ? ' ' + middleName : ''}`;
    } else if (lastName) {
      fullName = lastName;
    }

    // Format birthday
    let birthday = '';
    if (student.birthdate) {
      const birthDate = new Date(student.birthdate);
      const day = birthDate.getDate().toString().padStart(2, '0');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthName = monthNames[birthDate.getMonth()];
      const yearShort = birthDate.getFullYear().toString().slice(-2);
      birthday = `${day}-${monthName}-${yearShort}`;
    }

    // Get weight and height
    const weight = record?.weight || student.weight || 0;
    const height = record?.height || student.height || 0;
    const heightInMeters = height ? height / 100 : 0;
    const height2 = heightInMeters ? heightInMeters * heightInMeters : 0;

    // Get sex
    const sex = student.gender === 'Male' ? 'M' : student.gender === 'Female' ? 'F' : '';

    // Calculate age
    let ageYears = 0;
    let ageMonths = 0;
    if (student.birthdate) {
      const birthDate = new Date(student.birthdate);
      const measuredDate = record?.measured_at ? new Date(record.measured_at) : new Date();

      let totalMonths = (measuredDate.getFullYear() - birthDate.getFullYear()) * 12;
      totalMonths += measuredDate.getMonth() - birthDate.getMonth();

      if (measuredDate.getDate() < birthDate.getDate()) {
        totalMonths--;
      }

      ageYears = Math.floor(totalMonths / 12);
      ageMonths = totalMonths;
    }

    // Calculate BMI
    let bmi = 0;
    let nutritionalStatus = '';
    if (weight && height) {
      bmi = calculateBMI(weight, height);
      nutritionalStatus = getBMIStatus(bmi);

      // Map to template format
      if (nutritionalStatus === 'Severely Wasted') nutritionalStatus = 'Severely Wasted/SU';
      else if (nutritionalStatus === 'Wasted') nutritionalStatus = 'Wasted/U';
    }

    // Height-For-Age
    const heightForAge = record?.height_for_age_status || student.height_for_age_status || 'Normal';

    return {
      name: fullName,
      birthday,
      weight,
      height: heightInMeters,
      sex,
      height2,
      ageYears,
      ageMonths,
      bmi,
      nutritionalStatus,
      heightForAge,
    };
  });

  return {
    title: `${gradeLevel} ${formattedDate} Monthly Report`,
    date: formattedDate,
    schoolName,
    schoolYear,
    gradeLevel,
    students: studentData,
    preparedBy,
  };
}
