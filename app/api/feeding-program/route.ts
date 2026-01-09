import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/db';
import { requireRole, getCurrentUser } from '@/lib/auth';

// GET - Fetch feeding programs, beneficiaries, eligible students, etc.
export async function GET(request: NextRequest) {
  try {
    await requireRole('nutritionist', request);
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'programs';
    const programId = searchParams.get('program_id');

    if (type === 'programs') {
      // Get all feeding programs with beneficiary count
      const { data: programs, error } = await supabase
        .from('feeding_programs')
        .select(`
          *,
          feeding_program_beneficiaries(count)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase query error:', error);
        return NextResponse.json(
          { success: false, message: 'Error fetching programs' },
          { status: 500 }
        );
      }

      // Calculate total beneficiaries for each program
      const programsWithCount = await Promise.all(
        (programs || []).map(async (program: any) => {
          const { count } = await supabase
            .from('feeding_program_beneficiaries')
            .select('id', { count: 'exact', head: true })
            .eq('feeding_program_id', program.id);

          return {
            ...program,
            total_beneficiaries: count || 0,
          };
        })
      );

      return NextResponse.json({ success: true, programs: programsWithCount });
    } else if (type === 'beneficiaries' && programId) {
      // Get beneficiaries for a program
      const { data: beneficiaries, error } = await supabase
        .from('feeding_program_beneficiaries')
        .select(`
          *,
          students (
            id,
            lrn,
            first_name,
            middle_name,
            last_name,
            gender,
            age,
            grade_level
          )
        `)
        .eq('feeding_program_id', programId)
        .order('enrollment_date', { ascending: false });

      if (error) {
        console.error('Supabase query error:', error);
        return NextResponse.json(
          { success: false, message: 'Error fetching beneficiaries' },
          { status: 500 }
        );
      }

      // Get attendance and BMI data for each beneficiary
      const beneficiariesWithData = await Promise.all(
        (beneficiaries || []).map(async (beneficiary: any) => {
          // Get attendance
          const { count: totalAttendance } = await supabase
            .from('feeding_program_attendance')
            .select('id', { count: 'exact', head: true })
            .eq('beneficiary_id', beneficiary.id);

          const { count: daysPresent } = await supabase
            .from('feeding_program_attendance')
            .select('id', { count: 'exact', head: true })
            .eq('beneficiary_id', beneficiary.id)
            .eq('present', true);

          const attendanceRate =
            totalAttendance && totalAttendance > 0
              ? Math.round(((daysPresent ?? 0) / totalAttendance) * 100 * 100) / 100
              : 0;

          // Get latest BMI
          const { data: latestBMI } = await supabase
            .from('bmi_records')
            .select('bmi, bmi_status, measured_at')
            .eq('student_id', beneficiary.student_id)
            .order('measured_at', { ascending: false })
            .limit(1)
            .single();

          // Get BMI at enrollment
          const enrollmentDate = beneficiary.enrollment_date;
          const { data: bmiAtEnrollment } = await supabase
            .from('bmi_records')
            .select('bmi, bmi_status, measured_at')
            .eq('student_id', beneficiary.student_id)
            .lte('measured_at', enrollmentDate + 'T23:59:59')
            .order('measured_at', { ascending: false })
            .limit(1)
            .single();

          return {
            ...beneficiary,
            student: beneficiary.students,
            attendance_rate: attendanceRate,
            total_attendance: totalAttendance || 0,
            days_present: daysPresent || 0,
            bmi: latestBMI?.bmi || null,
            bmi_status: latestBMI?.bmi_status || null,
            bmi_at_enrollment: bmiAtEnrollment?.bmi || null,
            bmi_status_at_enrollment: bmiAtEnrollment?.bmi_status || null,
          };
        })
      );

      return NextResponse.json({
        success: true,
        beneficiaries: beneficiariesWithData,
      });
    } else if (type === 'eligible_students') {
      // Get students with Severely Wasted or Wasted BMI status
      const { data: bmiRecords, error: bmiError } = await supabase
        .from('bmi_records')
        .select('student_id, bmi, bmi_status, measured_at')
        .in('bmi_status', ['Severely Wasted', 'Wasted'])
        .order('measured_at', { ascending: false });

      if (bmiError) {
        console.error('Supabase query error:', bmiError);
        return NextResponse.json(
          { success: false, message: 'Error fetching eligible students' },
          { status: 500 }
        );
      }

      // Get latest BMI per student
      const latestBMIByStudent = new Map();
      (bmiRecords || []).forEach((record: any) => {
        if (
          !latestBMIByStudent.has(record.student_id) ||
          new Date(record.measured_at) >
            new Date(latestBMIByStudent.get(record.student_id).measured_at)
        ) {
          latestBMIByStudent.set(record.student_id, record);
        }
      });

      // Get students
      const studentIds = Array.from(latestBMIByStudent.keys());
      if (studentIds.length === 0) {
        return NextResponse.json({
          success: true,
          eligible_students: [],
        });
      }

      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .in('id', studentIds);

      if (studentsError) {
        console.error('Supabase query error:', studentsError);
        return NextResponse.json(
          { success: false, message: 'Error fetching students' },
          { status: 500 }
        );
      }

      // Filter out already enrolled students if program_id is provided
      let eligibleStudents = (students || []).map((student: any) => ({
        ...student,
        bmi: latestBMIByStudent.get(student.id)?.bmi,
        bmi_status: latestBMIByStudent.get(student.id)?.bmi_status,
        measured_at: latestBMIByStudent.get(student.id)?.measured_at,
      }));

      if (programId && programId !== '0') {
        const { data: enrolled } = await supabase
          .from('feeding_program_beneficiaries')
          .select('student_id')
          .eq('feeding_program_id', programId);

        const enrolledIds = new Set((enrolled || []).map((e: any) => e.student_id));
        eligibleStudents = eligibleStudents.filter(
          (s: any) => !enrolledIds.has(s.id)
        );
      }

      // Sort by BMI status priority
      eligibleStudents.sort((a: any, b: any) => {
        if (a.bmi_status === 'Severely Wasted' && b.bmi_status !== 'Severely Wasted')
          return -1;
        if (a.bmi_status !== 'Severely Wasted' && b.bmi_status === 'Severely Wasted')
          return 1;
        return 0;
      });

      return NextResponse.json({
        success: true,
        eligible_students: eligibleStudents,
      });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid type parameter' },
      { status: 400 }
    );
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 401 }
      );
    }
    console.error('Error in feeding program GET:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred' },
      { status: 500 }
    );
  }
}

// POST - Create program, add beneficiary, remove beneficiary, record attendance
export async function POST(request: NextRequest) {
  try {
    await requireRole('nutritionist', request);
    const user = await getCurrentUser(request);
    if (!user) throw new Error('Unauthorized');

    const body = await request.formData();
    const action = body.get('action') as string;

    const supabase = getSupabaseClient();

    if (action === 'create_program') {
      const name = (body.get('name') as string)?.trim() || '';
      const description = (body.get('description') as string)?.trim() || '';
      const startDate = (body.get('start_date') as string)?.trim() || '';
      const endDate = (body.get('end_date') as string)?.trim() || '';

      if (!name || !startDate || !endDate) {
        return NextResponse.json(
          { success: false, message: 'Name, start date, and end date are required' },
          { status: 400 }
        );
      }

      // Create program
      const { data: newProgram, error: programError } = await supabase
        .from('feeding_programs')
        .insert([
          {
            name,
            description,
            start_date: startDate,
            end_date: endDate,
            created_by: user.id,
            status: 'active',
          },
        ])
        .select('id')
        .single();

      if (programError || !newProgram) {
        console.error('Supabase insert error:', programError);
        return NextResponse.json(
          { success: false, message: 'Error creating program' },
          { status: 500 }
        );
      }

      // Auto-enroll students with poor BMI status
      const { data: eligibleStudents } = await supabase
        .from('bmi_records')
        .select('student_id')
        .in('bmi_status', ['Severely Wasted', 'Wasted'])
        .order('measured_at', { ascending: false });

      // Get latest BMI per student
      const latestByStudent = new Map();
      (eligibleStudents || []).forEach((record: any) => {
        if (!latestByStudent.has(record.student_id)) {
          latestByStudent.set(record.student_id, record);
        }
      });

      const studentIds = Array.from(latestByStudent.keys());
      let enrolledCount = 0;

      if (studentIds.length > 0) {
        // Insert beneficiaries
        const beneficiaries = studentIds.map((studentId) => ({
          feeding_program_id: newProgram.id,
          student_id: studentId,
          enrollment_date: startDate,
        }));

        const { error: beneficiaryError } = await supabase
          .from('feeding_program_beneficiaries')
          .insert(beneficiaries);

        if (!beneficiaryError) {
          enrolledCount = studentIds.length;
        }
      }

      // Create report entry
      const reportData = {
        program_id: newProgram.id,
        program_name: name,
        start_date: startDate,
        end_date: endDate,
        auto_enrolled: enrolledCount,
        created_date: new Date().toISOString(),
      };

      const { error: reportError } = await supabase.from('reports').insert([
        {
          title: `Feeding Program: ${name}`,
          report_type: 'feeding_program',
          description: `Feeding program report for ${name}. ${enrolledCount} students automatically enrolled based on BMI status.`,
          data: reportData,
          status: 'pending',
          generated_by: user.id,
        },
      ]);

      return NextResponse.json({
        success: true,
        message: `Program created successfully. ${enrolledCount} students with poor BMI status automatically enrolled. Report submitted for approval.`,
        program_id: newProgram.id,
        auto_enrolled: enrolledCount,
      });
    } else if (action === 'add_beneficiary') {
      const programId = parseInt(body.get('program_id') as string);
      const studentId = parseInt(body.get('student_id') as string);
      const enrollmentDate = (body.get('enrollment_date') as string) || new Date().toISOString().split('T')[0];

      if (!programId || !studentId) {
        return NextResponse.json(
          { success: false, message: 'Program ID and Student ID are required' },
          { status: 400 }
        );
      }

      const { error } = await supabase.from('feeding_program_beneficiaries').insert([
        {
          feeding_program_id: programId,
          student_id: studentId,
          enrollment_date: enrollmentDate,
        },
      ]);

      if (error) {
        console.error('Supabase insert error:', error);
        return NextResponse.json(
          { success: false, message: 'Error adding beneficiary' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Beneficiary added successfully',
      });
    } else if (action === 'remove_beneficiary') {
      const beneficiaryId = parseInt(body.get('beneficiary_id') as string);

      if (!beneficiaryId) {
        return NextResponse.json(
          { success: false, message: 'Beneficiary ID is required' },
          { status: 400 }
        );
      }

      // Delete attendance records first
      await supabase
        .from('feeding_program_attendance')
        .delete()
        .eq('beneficiary_id', beneficiaryId);

      // Delete beneficiary
      const { error, count } = await supabase
        .from('feeding_program_beneficiaries')
        .delete()
        .eq('id', beneficiaryId)
        .select('id');

      if (error) {
        console.error('Supabase delete error:', error);
        return NextResponse.json(
          { success: false, message: 'Error removing beneficiary' },
          { status: 500 }
        );
      }

      if (count === 0) {
        return NextResponse.json(
          { success: false, message: 'No beneficiary found with that ID' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Student removed from program successfully',
      });
    } else if (action === 'record_attendance') {
      const beneficiaryId = parseInt(body.get('beneficiary_id') as string);
      const attendanceDate = (body.get('attendance_date') as string) || new Date().toISOString().split('T')[0];
      const present = body.get('present') === '1' || body.get('present') === 'true';
      const notes = (body.get('notes') as string)?.trim() || '';

      if (!beneficiaryId) {
        return NextResponse.json(
          { success: false, message: 'Beneficiary ID is required' },
          { status: 400 }
        );
      }

      // Upsert attendance (insert or update)
      const { error } = await supabase
        .from('feeding_program_attendance')
        .upsert(
          {
            beneficiary_id: beneficiaryId,
            attendance_date: attendanceDate,
            present: present,
            notes: notes,
            recorded_by: user.id,
          },
          {
            onConflict: 'beneficiary_id,attendance_date',
          }
        );

      if (error) {
        console.error('Supabase upsert error:', error);
        return NextResponse.json(
          { success: false, message: 'Error recording attendance' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Attendance recorded successfully',
      });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid action' },
      { status: 400 }
    );
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 401 }
      );
    }
    console.error('Error in feeding program POST:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred' },
      { status: 500 }
    );
  }
}
