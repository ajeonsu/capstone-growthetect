import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/db';
import { getCurrentUser, requireAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request);
    const user = await getCurrentUser(request);
    if (!user) throw new Error('Unauthorized');

    const supabase = getSupabaseClient();
    const body = await request.json();
    const { report_id, report_created_at, school_name, school_year } = body;

    console.log('[FEEDING LIST] Generating feeding list report...');

    // Fetch ALL students from all grade levels
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('*')
      .order('grade_level', { ascending: true })
      .order('last_name', { ascending: true });

    if (studentsError || !students) {
      console.error('Error fetching students:', studentsError);
      return NextResponse.json(
        { success: false, message: 'Error fetching students' },
        { status: 500 }
      );
    }

    console.log(`[FEEDING LIST] Found ${students.length} total students`);

    // Determine the effective date from the passed-in created_at (no extra DB round-trip needed)
    let reportCreatedAt: Date | null = report_created_at ? new Date(report_created_at) : null;
    let preparedByName = user.name || user.email || 'Nutritionist';
    // Still look up the preparer name if we have a report_id
    if (report_id) {
      const { data: reportRecord } = await supabase
        .from('reports')
        .select('generated_by, created_at')
        .eq('id', report_id)
        .single();
      // Only fall back to DB created_at if frontend didn't supply it
      if (!reportCreatedAt && reportRecord?.created_at) {
        reportCreatedAt = new Date(reportRecord.created_at);
      }
      if (reportRecord?.generated_by) {
        const { data: reportCreator } = await supabase
          .from('users')
          .select('name')
          .eq('id', reportRecord.generated_by)
          .single();
        if (reportCreator?.name) preparedByName = reportCreator.name;
      }
    }

    // Compute the target date string in PH timezone (YYYY-MM-DD) to match against measured_at
    const targetDate = reportCreatedAt ?? new Date();
    const targetDateStr = targetDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }); // "YYYY-MM-DD"

    // Fetch only BMI records measured on the exact target date
    const { data: bmiRecords, error: bmiError } = await supabase
      .from('bmi_records')
      .select('*')
      .gte('measured_at', `${targetDateStr}T00:00:00`)
      .lte('measured_at', `${targetDateStr}T23:59:59`)
      .order('measured_at', { ascending: false });

    if (bmiError) {
      console.error('Error fetching BMI records:', bmiError);
      return NextResponse.json(
        { success: false, message: 'Error fetching BMI records' },
        { status: 500 }
      );
    }

    // Create a map of student_id → record for that day (keep latest if multiple on same day)
    const latestRecords = new Map();
    bmiRecords?.forEach((record: any) => {
      const studentId = record.student_id;
      if (!latestRecords.has(studentId)) {
        latestRecords.set(studentId, record);
      }
    });

    console.log(`[FEEDING LIST] Found ${latestRecords.size} students with BMI records`);

    // Grade level map
    const gradeMap: Record<number, string> = {
      0: 'Kinder',
      1: 'Grade 1',
      2: 'Grade 2',
      3: 'Grade 3',
      4: 'Grade 4',
      5: 'Grade 5',
      6: 'Grade 6',
    };

    // Process student data and filter for malnourished students
    const malnourishedStudents: any[] = [];

    students.forEach((student: any) => {
      const record = latestRecords.get(student.id);

      // Skip students who have no BMI record on the target date
      if (!record) return;

      // Get student name
      let fullName = '';
      if (student.last_name && student.first_name) {
        fullName = `${student.last_name}, ${student.first_name}`;
        if (student.middle_name) {
          fullName += ` ${student.middle_name.charAt(0)}.`;
        }
      } else if (student.first_name) {
        fullName = student.first_name;
        if (student.middle_name) {
          fullName += ` ${student.middle_name.charAt(0)}.`;
        }
        if (student.last_name) {
          fullName += ` ${student.last_name}`;
        }
      } else if (student.last_name) {
        fullName = student.last_name;
      }
      fullName = fullName.trim();

      // Format birthday
      let birthday = '';
      if (student.birthdate) {
        const birthDate = new Date(student.birthdate);
        const month = (birthDate.getMonth() + 1).toString().padStart(2, '0');
        const day = birthDate.getDate().toString().padStart(2, '0');
        const yearShort = birthDate.getFullYear().toString().slice(-2);
        birthday = `${month}/${day}/${yearShort}`;
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
        const measuredDate = record?.measured_at ? new Date(record.measured_at) : targetDate;

        let totalMonths = (measuredDate.getFullYear() - birthDate.getFullYear()) * 12;
        totalMonths += measuredDate.getMonth() - birthDate.getMonth();

        if (measuredDate.getDate() < birthDate.getDate()) {
          totalMonths--;
        }

        ageYears = Math.floor(totalMonths / 12);
        ageMonths = totalMonths; // Total months for the M column
      }

      // Calculate BMI
      const bmi = heightInMeters > 0 ? weight / height2 : 0;

      // Determine Nutritional Status (simplified)
      let nutritionalStatus = 'N/A';
      if (bmi > 0) {
        if (bmi < 16) nutritionalStatus = 'Severely Wasted';
        else if (bmi < 17) nutritionalStatus = 'Wasted';
        else if (bmi < 18.5) nutritionalStatus = 'Underweight';
        else if (bmi < 25) nutritionalStatus = 'Normal';
        else if (bmi < 30) nutritionalStatus = 'Overweight';
        else nutritionalStatus = 'Obese';
      }

      // Determine Height-For-Age (simplified)
      let heightForAge = 'N/A';
      if (ageYears > 0 && height > 0) {
        // This is a placeholder. Real HFA calculation requires growth charts.
        if (height < 100 && ageYears > 5) heightForAge = 'Severely Stunted';
        else if (height < 110 && ageYears > 6) heightForAge = 'Stunted';
        else if (height > 150 && ageYears < 10) heightForAge = 'Tall';
        else heightForAge = 'Normal';
      }

      // Filter: only include students who are malnourished
      // Criteria: Severely Wasted, Wasted, Severely Stunted, or Stunted
      const isMalnourished = 
        nutritionalStatus === 'Severely Wasted' ||
        nutritionalStatus === 'Wasted' ||
        heightForAge === 'Severely Stunted' ||
        heightForAge === 'Stunted';

      if (isMalnourished) {
        malnourishedStudents.push({
          id: student.id,
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
          gradeSection: gradeMap[student.grade_level] || 'Unknown',
        });
      }
    });

    console.log(`[FEEDING LIST] Found ${malnourishedStudents.length} malnourished students weighed on ${targetDateStr}`);

    const finalWeighingDate = targetDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Manila',
    });

    return NextResponse.json({
      success: true,
      message: 'Feeding list data generated successfully',
      pdf_data: {
        title: body.title || 'List for Feeding',
        date: finalWeighingDate,
        weighingDate: finalWeighingDate,
        schoolName: school_name || 'SCIENCE CITY OF MUNOZ',
        schoolYear: school_year || '2025-2026',
        students: malnourishedStudents,
        preparedBy: preparedByName,
      },
    });
  } catch (error: any) {
    console.error('[FEEDING LIST] Error:', error);
    return NextResponse.json(
      { success: false, message: 'Error generating feeding list data', error: error?.message },
      { status: 500 }
    );
  }
}
