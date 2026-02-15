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
  // Check if "All levels" is selected
  if (gradeLevel === 'All levels') {
    return await generateAllLevelsPDFReportData(supabase, reportMonth, schoolName, schoolYear, preparedBy);
  }

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
  
  // Calculate proper month start and end dates in Philippine timezone (UTC+8)
  // Create dates in Philippine timezone
  const phTimeZone = 'Asia/Manila';
  const monthStartDate = new Date(parseInt(year), parseInt(month) - 1, 1, 0, 0, 0, 0);
  const monthEndDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
  
  // Convert to ISO strings for database query
  const monthStart = monthStartDate.toISOString();
  const monthEnd = monthEndDate.toISOString();

  console.log('[GENERATE PDF] Date range (PH Time):', { 
    monthStart, 
    monthEnd,
    startLocal: monthStartDate.toLocaleString('en-US', { timeZone: phTimeZone }),
    endLocal: monthEndDate.toLocaleString('en-US', { timeZone: phTimeZone })
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
  let latestMeasurementDate = null as Date | null;
  
  console.log('[GENERATE PDF] Total BMI records found:', bmiRecords?.length || 0);
  
  bmiRecords?.forEach((record: any) => {
    const studentId = record.student_id;
    const recordDate = new Date(record.measured_at);
    
    console.log('[GENERATE PDF] Processing record:', {
      student_id: studentId,
      measured_at: record.measured_at,
      recordDate: recordDate.toISOString(),
      recordDatePH: recordDate.toLocaleString('en-US', { timeZone: 'Asia/Manila' })
    });
    
    // Track the latest measurement date across all records
    if (!latestMeasurementDate || recordDate > latestMeasurementDate) {
      latestMeasurementDate = recordDate;
      console.log('[GENERATE PDF] New latest date found:', {
        iso: latestMeasurementDate.toISOString(),
        ph: latestMeasurementDate.toLocaleString('en-US', { timeZone: 'Asia/Manila' })
      });
    }
    
    const existing = latestRecords.get(studentId);
    if (!existing || recordDate > new Date(existing.measured_at)) {
      latestRecords.set(studentId, record);
    }
  });

  // Format date for display - use actual latest measurement date in Philippine timezone
  const formattedDate = latestMeasurementDate 
    ? latestMeasurementDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'Asia/Manila'
      })
    : new Date(reportMonth + '-15').toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'Asia/Manila'
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

// Helper function to generate PDF report data for all levels
async function generateAllLevelsPDFReportData(
  supabase: any,
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

  // Parse month (format: YYYY-MM)
  const [year, month] = reportMonth.split('-');
  
  // Calculate proper month start and end dates in Philippine timezone (UTC+8)
  const phTimeZone = 'Asia/Manila';
  const monthStartDate = new Date(parseInt(year), parseInt(month) - 1, 1, 0, 0, 0, 0);
  const monthEndDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
  
  // Convert to ISO strings for database query
  const monthStart = monthStartDate.toISOString();
  const monthEnd = monthEndDate.toISOString();

  console.log('[GENERATE PDF ALL LEVELS] Date range (PH Time):', { 
    monthStart, 
    monthEnd,
    startLocal: monthStartDate.toLocaleString('en-US', { timeZone: phTimeZone }),
    endLocal: monthEndDate.toLocaleString('en-US', { timeZone: phTimeZone })
  });

  // Fetch all students from Kinder to Grade 6
  const { data: allStudents, error: studentsError } = await supabase
    .from('students')
    .select('*')
    .in('grade_level', [0, 1, 2, 3, 4, 5, 6]);

  if (studentsError || !allStudents) {
    console.error('[GENERATE PDF ALL LEVELS] Error fetching students:', studentsError);
    throw new Error('Error fetching students');
  }

  console.log('[GENERATE PDF ALL LEVELS] Fetched students:', allStudents.length);
  console.log('[GENERATE PDF ALL LEVELS] Students by grade:', allStudents.reduce((acc: any, s: any) => {
    acc[s.grade_level] = (acc[s.grade_level] || 0) + 1;
    return acc;
  }, {}));

  // Fetch BMI records for the month
  const { data: bmiRecords, error: bmiError } = await supabase
    .from('bmi_records')
    .select('*')
    .gte('measured_at', monthStart)
    .lte('measured_at', monthEnd)
    .order('measured_at', { ascending: false });

  if (bmiError) {
    console.error('[GENERATE PDF ALL LEVELS] Error fetching BMI records:', bmiError);
    throw new Error('Error fetching BMI records');
  }

  console.log('[GENERATE PDF ALL LEVELS] Fetched BMI records:', bmiRecords?.length || 0);

  // Create a map of student_id to latest BMI record for the month
  const latestRecords = new Map();
  let latestMeasurementDate = null as Date | null;
  
  console.log('[GENERATE PDF ALL LEVELS] Total BMI records found:', bmiRecords?.length || 0);
  
  bmiRecords?.forEach((record: any) => {
    const studentId = record.student_id;
    const recordDate = new Date(record.measured_at);
    
    // Track the latest measurement date across all records
    if (!latestMeasurementDate || recordDate > latestMeasurementDate) {
      latestMeasurementDate = recordDate;
    }
    
    const existing = latestRecords.get(studentId);
    if (!existing || recordDate > new Date(existing.measured_at)) {
      latestRecords.set(studentId, record);
    }
  });

  // Format date for display - use actual latest measurement date in Philippine timezone
  const formattedDate = latestMeasurementDate 
    ? latestMeasurementDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'Asia/Manila'
      })
    : new Date(reportMonth + '-15').toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'Asia/Manila'
      });

  // Group students by grade level
  const gradeLevels = ['Kinder', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];
  const allGradeData: any[] = [];

  for (const gradeLevel of gradeLevels) {
    const dbGradeLevel = gradeMap[gradeLevel];
    const gradeStudents = allStudents.filter((s: any) => s.grade_level === dbGradeLevel);

    console.log(`[GENERATE PDF ALL LEVELS] ${gradeLevel} (${dbGradeLevel}): ${gradeStudents.length} students found`);

    // Process student data for this grade
    const studentData = gradeStudents.map((student: any) => {
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

    console.log(`[GENERATE PDF ALL LEVELS] ${gradeLevel}: Processed ${studentData.length} students for PDF`);

    // Add grade data to the collection
    allGradeData.push({
      gradeLevel,
      students: studentData,
    });
  }

  console.log('[GENERATE PDF ALL LEVELS] Total grade data entries:', allGradeData.length);
  console.log('[GENERATE PDF ALL LEVELS] Students per grade:', allGradeData.map(g => ({ grade: g.gradeLevel, count: g.students.length })));

  return {
    title: `All Levels ${formattedDate} Monthly Report`,
    date: formattedDate,
    schoolName,
    schoolYear,
    gradeLevel: 'All levels',
    allGradeData,
    preparedBy,
  };
}
