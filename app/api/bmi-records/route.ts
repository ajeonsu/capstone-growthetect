import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { calculateBMI, getBMIStatus, getHeightForAgeStatus, calculateAge } from '@/lib/helpers';

export const dynamic = 'force-dynamic';

// GET - Fetch BMI records
export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('student_id');
    const date = searchParams.get('date');
    const search = searchParams.get('search');
    const gender = searchParams.get('gender');
    const grade = searchParams.get('grade');
    const status = searchParams.get('status');
    const hfaStatus = searchParams.get('hfa_status');
    // ?latest_only=true — return only the most recent record per student
    const latestOnly = searchParams.get('latest_only') === 'true';
    // ?all=true — return all records without dedup (used for history modal)
    const skipDedup = searchParams.get('all') === 'true';

    const supabase = getSupabaseClient();

    // When fetching a single student's full history we include all records;
    // otherwise only select the columns actually used to reduce payload size.
    const selectColumns = studentId
      ? `id, student_id, weight, height, bmi, bmi_status, height_for_age_status, measured_at, source,
          students (
            first_name, middle_name, last_name, lrn, age, birthdate, gender, grade_level, section,
            parent_guardian, contact_number
          )`
      : `id, student_id, weight, height, bmi, bmi_status, height_for_age_status, measured_at,
          students (
            first_name, last_name, lrn, age, birthdate, gender, grade_level, section
          )`;

    let query = supabase
      .from('bmi_records')
      .select(selectColumns);

    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    if (status) {
      query = query.eq('bmi_status', status);
    }

    if (hfaStatus) {
      query = query.eq('height_for_age_status', hfaStatus);
    }

    query = query.order('measured_at', { ascending: false });

    // Limit rows when only latest-per-student is needed (e.g. monthly overview)
    // A school with ~500 students rarely exceeds 5 records/student; 3000 is a safe cap.
    if (latestOnly && !studentId) {
      query = (query as any).limit(3000);
    }

    const { data: allRecords, error } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json(
        { success: false, message: 'Error fetching BMI records' },
        { status: 500 }
      );
    }

    // Filter records based on search, gender, grade, date
    let filteredRecords = allRecords || [];

    if (date) {
      filteredRecords = filteredRecords.filter((record: any) => {
        if (!record.measured_at) return false;
        const recordDate = new Date(record.measured_at).toISOString().split('T')[0];
        // Extract year-month from both dates (YYYY-MM format)
        const recordYearMonth = recordDate.substring(0, 7); // "2025-11"
        const filterYearMonth = date.substring(0, 7); // "2025-11"
        return recordYearMonth === filterYearMonth;
      });
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filteredRecords = filteredRecords.filter((record: any) => {
        const student = record.students;
        if (!student) return false;
        return (
          student.first_name?.toLowerCase().includes(searchLower) ||
          student.last_name?.toLowerCase().includes(searchLower) ||
          student.lrn?.toLowerCase().includes(searchLower)
        );
      });
    }

    if (gender) {
      filteredRecords = filteredRecords.filter(
        (record: any) => record.students?.gender === gender
      );
    }

    if (grade) {
      filteredRecords = filteredRecords.filter(
        (record: any) => record.students?.grade_level === parseInt(grade)
      );
    }

    // If no studentId specified AND not skipping dedup, get only latest record per student
    if (!studentId && !skipDedup) {
      const latestByStudent = new Map();
      filteredRecords.forEach((record: any) => {
        const studentId = record.student_id;
        const existing = latestByStudent.get(studentId);
        if (!existing || new Date(record.measured_at) > new Date(existing.measured_at)) {
          latestByStudent.set(studentId, record);
        }
      });
      filteredRecords = Array.from(latestByStudent.values());
    }

    // Flatten the structure to match the original format
    const records = filteredRecords.map((record: any) => {
      const student = record.students || {};
      return {
        ...record,
        first_name: student.first_name,
        middle_name: student.middle_name,
        last_name: student.last_name,
        lrn: student.lrn,
        age: student.birthdate ? calculateAge(student.birthdate) : student.age,
        gender: student.gender,
        grade_level: student.grade_level,
        section: student.section,
        parent_guardian: student.parent_guardian,
        contact_number: student.contact_number,
      };
    });

    return NextResponse.json({
      success: true,
      records,
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('Error fetching BMI records:', error);
    return NextResponse.json(
      { success: false, message: 'Error fetching BMI records' },
      { status: 500 }
    );
  }
}

// POST - Create new BMI record
export async function POST(request: NextRequest) {
  try {
    await requireAuth(request);

    const body = await request.formData();
    const studentId = body.get('student_id') as string;
    const weight = parseFloat(body.get('weight') as string);
    const height = parseFloat(body.get('height') as string);
    const source = (body.get('source') as string) || 'manual';
    
    // Convert to Philippine timezone (UTC+8) before storing
    const now = new Date();
    const phTime = new Date(now.getTime() + (8 * 60 * 60 * 1000)); // Add 8 hours
    const measuredAt = body.get('measured_at') as string || phTime.toISOString();
    
    const phDateString = phTime.toLocaleString('en-US', { 
      timeZone: 'Asia/Manila', 
      dateStyle: 'full', 
      timeStyle: 'long' 
    });

    console.log('[BMI-RECORDS] POST request received:', {
      studentId,
      weight,
      height,
      source,
      measuredAt,
      'Philippine Time': phDateString,
      'UTC Time': now.toISOString(),
      'Time added': '+8 hours for Philippine timezone',
    });

    if (!studentId || !weight || !height) {
      console.log('[BMI-RECORDS] Missing required fields');
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate weight and height with realistic ranges for students
    if (isNaN(weight) || weight <= 0 || weight > 200) {
      return NextResponse.json(
        { success: false, message: 'Weight must be between 1 and 200 kg' },
        { status: 400 }
      );
    }

    if (isNaN(height) || height <= 0 || height > 250) {
      return NextResponse.json(
        { success: false, message: 'Height must be between 1 and 250 cm' },
        { status: 400 }
      );
    }

    // Validate realistic ranges for students (Kinder to Grade 6)
    // Typical height: 80-180 cm, weight: 10-80 kg
    if (height < 50 || height > 200) {
      return NextResponse.json(
        { success: false, message: 'Height must be between 50 and 200 cm for students' },
        { status: 400 }
      );
    }

    if (weight < 5 || weight > 150) {
      return NextResponse.json(
        { success: false, message: 'Weight must be between 5 and 150 kg for students' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Convert studentId to integer
    const studentIdInt = parseInt(studentId);
    if (isNaN(studentIdInt)) {
      return NextResponse.json(
        { success: false, message: 'Invalid student ID' },
        { status: 400 }
      );
    }

    // Get student age (also fetch birthdate so we can compute current age)
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('age, birthdate')
      .eq('id', studentIdInt)
      .single();

    if (studentError || !student) {
      console.error('[BMI-RECORDS] Student not found:', studentError);
      return NextResponse.json(
        { success: false, message: 'Student not found' },
        { status: 404 }
      );
    }

    const bmi = calculateBMI(weight, height);
    
    // Validate BMI is within reasonable range (prevent overflow)
    if (bmi > 100 || bmi < 5) {
      return NextResponse.json(
        { success: false, message: `Invalid BMI calculation (${bmi.toFixed(2)}). Please check weight and height values.` },
        { status: 400 }
      );
    }
    
    // Round BMI to 2 decimal places to prevent overflow
    const roundedBMI = Math.round(bmi * 100) / 100;
    const bmiStatus = getBMIStatus(roundedBMI);
    
    // Calculate Height-For-Age status using current computed age from birthdate
    const currentAge = student.birthdate ? calculateAge(student.birthdate) : (student.age || 0);
    const heightForAgeStatus = getHeightForAgeStatus(height, currentAge);

    console.log('[BMI-RECORDS] Calculated BMI:', { bmi, bmiStatus, heightForAgeStatus });

    // Insert BMI record - use rounded BMI
    // DO NOT include 'id' field - let Supabase auto-generate it
    const insertData: any = {
      student_id: studentIdInt,
      weight: Math.round(weight * 100) / 100, // Round to 2 decimals
      height: Math.round(height * 100) / 100, // Round to 2 decimals
      bmi: roundedBMI, // Already rounded
      bmi_status: bmiStatus,
      height_for_age_status: heightForAgeStatus,
      measurement_source: source,
      measured_at: measuredAt,
    };

    // Remove any id field if it exists (shouldn't, but just in case)
    delete insertData.id;
    delete insertData.created_at;
    delete insertData.updated_at;

    console.log('[BMI-RECORDS] Inserting data:', JSON.stringify(insertData, null, 2));

    const { data: newRecord, error: insertError } = await supabase
      .from('bmi_records')
      .insert([insertData])
      .select('id')
      .single();

    if (insertError) {
      console.error('[BMI-RECORDS] Supabase insert error:', insertError);
      console.error('[BMI-RECORDS] Error code:', insertError.code);
      console.error('[BMI-RECORDS] Error details:', JSON.stringify(insertError, null, 2));
      
      // Handle specific error cases
      let errorMessage = 'Error creating BMI record';
      
      if (insertError.code === '23505' || insertError.message?.includes('duplicate key') || insertError.message?.includes('bmi_records_pkey')) {
        // Unique constraint violation (duplicate key) - sequence is out of sync
        // Get max ID to provide helpful error message
        const { data: maxRecord } = await supabase
          .from('bmi_records')
          .select('id')
          .order('id', { ascending: false })
          .limit(1)
          .single();
        
        const maxId = maxRecord?.id || 0;
        errorMessage = `Database sequence error. The sequence needs to be reset. Please run this SQL in Supabase SQL Editor: SELECT setval('bmi_records_id_seq', ${maxId + 1}, true);`;
      } else if (insertError.message) {
        errorMessage = `Error creating BMI record: ${insertError.message}`;
      }
      
      return NextResponse.json(
        { 
          success: false, 
          message: errorMessage,
          error: insertError.message,
          errorCode: insertError.code,
        },
        { status: 500 }
      );
    }

    console.log('[BMI-RECORDS] Record created successfully:', newRecord);

    return NextResponse.json({
      success: true,
      message: 'BMI recorded successfully',
      bmi: roundedBMI,
      status: bmiStatus,
      record_id: newRecord.id,
    });
  } catch (error: any) {
    console.error('[BMI-RECORDS] Unexpected error:', error);
    console.error('[BMI-RECORDS] Error stack:', error.stack);
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        message: `Error creating BMI record: ${error.message || 'Unknown error'}`,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
