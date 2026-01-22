import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { calculateBMI, getBMIStatus, calculateAge } from '@/lib/helpers';

// POST - Generate CSV report on-demand
export async function POST(request: NextRequest) {
  try {
    await requireAuth(request);

    const supabase = getSupabaseClient();
    const body = await request.json();
    const { report_id, grade_level, report_month } = body;

    if (!grade_level || !report_month) {
      return NextResponse.json(
        { success: false, message: 'Grade level and report month are required' },
        { status: 400 }
      );
    }

    // Generate CSV
    let csvPath: string;
    let csvContent: string = '';
    try {
      const result = await generateCSVReport(supabase, grade_level, report_month);
      csvPath = result.path;
      csvContent = result.content;
    } catch (csvError: any) {
      console.error('[GENERATE CSV] CSV generation error:', csvError);
      const errorMessage = csvError?.message || 'Unknown error during CSV generation';
      return NextResponse.json(
        { success: false, message: `CSV generation failed: ${errorMessage}`, error: errorMessage },
        { status: 500 }
      );
    }

    // Update report with CSV path and content if report_id is provided
    if (report_id && csvPath) {
      // Get current report data
      const { data: currentReport } = await supabase
        .from('reports')
        .select('data')
        .eq('id', report_id)
        .single();

      let reportData: any = {};
      if (currentReport?.data) {
        try {
          reportData = typeof currentReport.data === 'string' 
            ? JSON.parse(currentReport.data) 
            : currentReport.data;
        } catch (e) {
          reportData = {};
        }
      }

      // Store CSV content in report data if storage failed
      if (csvPath.startsWith('db:csv:')) {
        reportData.csv_content = csvContent;
        reportData.csv_stored_in_db = true;
      }

      const { error: updateError } = await supabase
        .from('reports')
        .update({ 
          pdf_file: csvPath,
          data: JSON.stringify(reportData)
        })
        .eq('id', report_id);

      if (updateError) {
        console.error('[GENERATE CSV] Error updating report:', updateError);
        // Still return success since CSV was generated, just update failed
      }
    }

    return NextResponse.json({
      success: true,
      file_path: csvPath,
      csv_content: csvContent, // Include content in case storage failed
    });
  } catch (error: any) {
    console.error('[GENERATE CSV] Unexpected error:', error);
    return NextResponse.json(
      { success: false, message: `Unexpected error: ${error?.message || 'Unknown error'}`, error: error?.message },
      { status: 500 }
    );
  }
}

// Helper function to generate CSV report
async function generateCSVReport(
  supabase: any,
  gradeLevel: string,
  reportMonth: string
): Promise<{ path: string; content: string }> {
  // Map grade level string to integer (as stored in database)
  const gradeMap: Record<string, number> = {
    'Kinder': 0,
    'Grade 1': 1,
    'Grade 2': 2,
    'Grade 3': 3,
    'Grade 4': 4,
    'Grade 5': 5,
    'Grade 6': 6,
  };
  const dbGradeLevel = gradeMap[gradeLevel];
  
  if (dbGradeLevel === undefined) {
    throw new Error(`Invalid grade level: ${gradeLevel}. Expected: Kinder, Grade 1-6`);
  }

  // Parse month (format: YYYY-MM)
  const [year, month] = reportMonth.split('-');
  const monthStart = `${year}-${month}-01`;
  const monthEnd = `${year}-${month}-31`;

  // Fetch students by grade level
  console.log('[GENERATE CSV] Fetching students for grade:', dbGradeLevel);
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('*')
    .eq('grade_level', dbGradeLevel);

  if (studentsError) {
    console.error('[GENERATE CSV] Students query error:', studentsError);
    throw new Error(`Failed to fetch students: ${studentsError.message || 'Unknown error'}`);
  }

  if (!students || students.length === 0) {
    console.log('[GENERATE CSV] No students found for grade:', dbGradeLevel);
    // Still generate CSV with just headers if no students
  }

  // Fetch BMI records for the month
  console.log('[GENERATE CSV] Fetching BMI records for month:', monthStart, 'to', monthEnd);
  const { data: bmiRecords, error: bmiError } = await supabase
    .from('bmi_records')
    .select('*, students(*)')
    .gte('measured_at', monthStart)
    .lte('measured_at', monthEnd)
    .order('measured_at', { ascending: false });

  if (bmiError) {
    console.error('[GENERATE CSV] BMI records query error:', bmiError);
    throw new Error(`Failed to fetch BMI records: ${bmiError.message || 'Unknown error'}`);
  }

  console.log('[GENERATE CSV] Found', students?.length || 0, 'students and', bmiRecords?.length || 0, 'BMI records');

  // Create a map of student_id to latest BMI record for the month
  const latestRecords = new Map();
  bmiRecords?.forEach((record: any) => {
    const studentId = record.student_id;
    const existing = latestRecords.get(studentId);
    if (!existing || new Date(record.measured_at) > new Date(existing.measured_at)) {
      latestRecords.set(studentId, record);
    }
  });

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

  // Generate CSV content
  const csvRows: string[] = [];
  
  // CSV Header - matching the template format (properly escaped)
  // Add two header rows: first row has "Age" spanning Y and M, second row has Y and M sub-headers
  // Row 1: Main headers with "Age" in place of Y and M
  const mainHeaders = ['Names', 'Birthday', 'Weight (kg)', 'Height (meters)', 'Sex', 'Height2 (m2)', 'Age', '', 'BMI', 'Nutritional Status', 'Height-For-Age'];
  csvRows.push(mainHeaders.map(escapeCsvField).join(','));
  
  // Row 2: Sub-headers with Y and M under Age
  const subHeaders = ['', '', '', '', '', '', 'Y', 'M', '', '', ''];
  csvRows.push(subHeaders.map(escapeCsvField).join(','));

  // Process each student
  students.forEach((student: any) => {
    const record = latestRecords.get(student.id);
    
    // Get student name
    const fullName = `${student.last_name || ''}, ${student.first_name || ''} ${student.middle_name || ''}`.trim().replace(/,$/, '');
    
    // Format birthday (DD-MMM-YY format like "23-Apr-20")
    let birthday = '';
    if (student.birthdate) {
      const birthDate = new Date(student.birthdate);
      const day = birthDate.getDate().toString().padStart(2, '0');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[birthDate.getMonth()];
      const year = birthDate.getFullYear().toString().slice(-2);
      birthday = `${day}-${month}-${year}`;
    }

    // Get weight and height from record or student
    const weight = record?.weight || student.weight || '';
    const height = record?.height || student.height || '';
    const heightInMeters = height ? (height / 100).toFixed(2) : '';
    const height2 = heightInMeters ? (parseFloat(heightInMeters) * parseFloat(heightInMeters)).toFixed(4) : '';

    // Get sex
    const sex = student.gender === 'Male' ? 'M' : student.gender === 'Female' ? 'F' : '';

    // Calculate age in months (total months) and years
    let ageYears = '';
    let ageMonths = '';
    if (student.birthdate) {
      const birthDate = new Date(student.birthdate);
      const measuredDate = record?.measured_at ? new Date(record.measured_at) : new Date();
      
      // Calculate total months
      let totalMonths = (measuredDate.getFullYear() - birthDate.getFullYear()) * 12;
      totalMonths += measuredDate.getMonth() - birthDate.getMonth();
      
      if (measuredDate.getDate() < birthDate.getDate()) {
        totalMonths--;
      }
      
      // Calculate years and remaining months
      const years = Math.floor(totalMonths / 12);
      const months = totalMonths % 12;
      
      ageYears = years.toString();
      ageMonths = totalMonths.toString(); // Total months for the M column
    }

    // Calculate BMI
    let bmi = '';
    let nutritionalStatus = '';
    if (weight && height) {
      bmi = calculateBMI(weight, height).toFixed(1);
      nutritionalStatus = getBMIStatus(parseFloat(bmi));
      
      // Map to template format
      if (nutritionalStatus === 'Severely Wasted') nutritionalStatus = 'Severely Wasted/SU';
      else if (nutritionalStatus === 'Wasted') nutritionalStatus = 'Wasted/U';
    }

    // Height-For-Age (simplified - you may need to implement proper HFA calculation)
    let heightForAge = record?.height_for_age_status || student.height_for_age_status || '';
    if (!heightForAge && height && student.birthdate) {
      // Simple logic - you may need proper HFA calculation
      heightForAge = 'Normal'; // Placeholder
    }

    // Add row to CSV with proper escaping
    // Age is split into Y (years) and M (total months) columns
    csvRows.push([
      escapeCsvField(fullName),
      escapeCsvField(birthday),
      escapeCsvField(weight || ''),
      escapeCsvField(heightInMeters),
      escapeCsvField(sex),
      escapeCsvField(height2),
      escapeCsvField(ageYears), // Y column (years)
      escapeCsvField(ageMonths), // M column (total months)
      escapeCsvField(bmi),
      escapeCsvField(nutritionalStatus),
      escapeCsvField(heightForAge)
    ].join(','));
  });

  // Generate CSV content
  const csvContent = csvRows.join('\n');

  // Generate filename
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 9);
  const filename = `report_${timestamp}_${randomId}.csv`;
  let filePath = `capstone/uploads/reports/${filename}`;

  // Try to upload to Supabase Storage, but if it fails, we'll store CSV in database
  console.log('[GENERATE CSV] Attempting to upload CSV to storage:', filePath);
  let storageSuccess = false;
  const possibleBuckets = ['capstone', 'uploads', 'reports', 'files'];
  
  for (const bucketName of possibleBuckets) {
    try {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, csvContent, {
          contentType: 'text/csv',
          upsert: false
        });

      if (!uploadError) {
        console.log(`[GENERATE CSV] CSV uploaded successfully to bucket '${bucketName}':`, filePath);
        storageSuccess = true;
        break;
      } else {
        console.log(`[GENERATE CSV] Bucket '${bucketName}' failed:`, uploadError.message);
      }
    } catch (storageError: any) {
      console.log(`[GENERATE CSV] Bucket '${bucketName}' exception:`, storageError.message);
      continue;
    }
  }

  if (!storageSuccess) {
    console.warn('[GENERATE CSV] All storage buckets failed. CSV will be stored in database instead.');
    // Store CSV content in a special format that can be retrieved later
    // We'll use a special path format to indicate it's in the database
    filePath = `db:csv:${Date.now()}:${Math.random().toString(36).substring(2, 9)}`;
  }

  // Return both path and content
  return { path: filePath, content: csvContent };
}
