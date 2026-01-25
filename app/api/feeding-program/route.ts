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

      // Calculate total beneficiaries for each program and update status if ended
      const currentDate = new Date();
      const programsWithCount = await Promise.all(
        (programs || []).map(async (program: any) => {
          const { count } = await supabase
            .from('feeding_program_beneficiaries')
            .select('id', { count: 'exact', head: true })
            .eq('feeding_program_id', program.id);

          // Check if program has ended
          const endDate = new Date(program.end_date);
          let status = program.status;
          
          if (currentDate > endDate && program.status === 'active') {
            // Update status to ended
            await supabase
              .from('feeding_programs')
              .update({ status: 'ended' })
              .eq('id', program.id);
            status = 'ended';
          }

          return {
            ...program,
            status: status,
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

          // Get latest BMI and HFA
          const { data: latestBMI } = await supabase
            .from('bmi_records')
            .select('bmi, bmi_status, height_for_age_status, measured_at')
            .eq('student_id', beneficiary.student_id)
            .order('measured_at', { ascending: false })
            .limit(1)
            .single();

          // Get BMI and HFA at enrollment
          const enrollmentDate = beneficiary.enrollment_date;
          const { data: bmiAtEnrollment } = await supabase
            .from('bmi_records')
            .select('bmi, bmi_status, height_for_age_status, measured_at')
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
            height_for_age_status: latestBMI?.height_for_age_status || null,
            bmi_at_enrollment: bmiAtEnrollment?.bmi || null,
            bmi_status_at_enrollment: bmiAtEnrollment?.bmi_status || null,
            height_for_age_status_at_enrollment: bmiAtEnrollment?.height_for_age_status || null,
          };
        })
      );

      return NextResponse.json({
        success: true,
        beneficiaries: beneficiariesWithData,
      });
      } else if (type === 'eligible_students') {
        // Get students with Severely Wasted or Wasted BMI status
        // OR Severely Stunted or Stunted Height For Age status
        const { data: bmiRecords, error: bmiError } = await supabase
          .from('bmi_records')
          .select('student_id, bmi, bmi_status, height_for_age_status, measured_at')
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
          if (!latestBMIByStudent.has(record.student_id)) {
            // Check if student has poor BMI OR poor HFA
            const hasPoorBMI = record.bmi_status === 'Severely Wasted' || record.bmi_status === 'Wasted';
            const hasPoorHFA = record.height_for_age_status === 'Severely Stunted' || record.height_for_age_status === 'Stunted';
            
            if (hasPoorBMI || hasPoorHFA) {
              latestBMIByStudent.set(record.student_id, record);
            }
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
          height_for_age_status: latestBMIByStudent.get(student.id)?.height_for_age_status,
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
      } else if (programId === '0') {
        // For overall count, exclude students enrolled in ANY active program
        console.log('[ALERT COUNT] Calculating overall eligible count...');
        console.log('[ALERT COUNT] Total eligible students before filtering:', eligibleStudents.length);
        eligibleStudents.forEach((s: any) => {
          console.log(`  - ${s.first_name} ${s.last_name}: BMI=${s.bmi_status}, HFA=${s.height_for_age_status}`);
        });

        // Get active programs (status='active' AND end_date hasn't passed)
        const { data: activePrograms } = await supabase
          .from('feeding_programs')
          .select('id, name, end_date, status')
          .eq('status', 'active');

        // Filter out programs where end_date has passed
        const currentDate = new Date();
        const trulyActivePrograms = (activePrograms || []).filter((p: any) => {
          if (p.end_date) {
            const endDate = new Date(p.end_date);
            return currentDate <= endDate; // Only include if not yet ended
          }
          return true; // Include if no end_date
        });

        console.log('[ALERT COUNT] Active programs:', trulyActivePrograms?.map((p: any) => `${p.name} (ID: ${p.id})`));

        if (trulyActivePrograms && trulyActivePrograms.length > 0) {
          const activeProgramIds = trulyActivePrograms.map((p: any) => p.id);
          const { data: enrolledInActive } = await supabase
            .from('feeding_program_beneficiaries')
            .select('student_id, feeding_program_id')
            .in('feeding_program_id', activeProgramIds);

          console.log('[ALERT COUNT] Students enrolled in active programs:', enrolledInActive?.length);
          enrolledInActive?.forEach((e: any) => {
            const student = eligibleStudents.find((s: any) => s.id === e.student_id);
            if (student) {
              console.log(`  - ${student.first_name} ${student.last_name} (ID: ${e.student_id}) in program ${e.feeding_program_id}`);
            }
          });

          const enrolledIds = new Set((enrolledInActive || []).map((e: any) => e.student_id));
          eligibleStudents = eligibleStudents.filter((s: any) => !enrolledIds.has(s.id));
          
          console.log('[ALERT COUNT] After filtering, remaining students needing support:', eligibleStudents.length);
          eligibleStudents.forEach((s: any) => {
            console.log(`  - ${s.first_name} ${s.last_name}: BMI=${s.bmi_status}, HFA=${s.height_for_age_status}`);
          });
        }
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

      return NextResponse.json({
        success: true,
        message: 'Program created successfully',
        program_id: newProgram.id,
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
    } else if (action === 'delete_program') {
      const programId = parseInt(body.get('program_id') as string);

      if (!programId) {
        return NextResponse.json(
          { success: false, message: 'Program ID is required' },
          { status: 400 }
        );
      }

      // Delete attendance records first (cascade through beneficiaries)
      const { data: beneficiaries } = await supabase
        .from('feeding_program_beneficiaries')
        .select('id')
        .eq('feeding_program_id', programId);

      if (beneficiaries && beneficiaries.length > 0) {
        const beneficiaryIds = beneficiaries.map((b: any) => b.id);
        
        // Delete attendance records
        await supabase
          .from('feeding_program_attendance')
          .delete()
          .in('beneficiary_id', beneficiaryIds);
      }

      // Delete beneficiaries
      await supabase
        .from('feeding_program_beneficiaries')
        .delete()
        .eq('feeding_program_id', programId);

      // Delete the program
      const { error } = await supabase
        .from('feeding_programs')
        .delete()
        .eq('id', programId);

      if (error) {
        console.error('Supabase delete error:', error);
        return NextResponse.json(
          { success: false, message: 'Error deleting program' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Feeding program deleted successfully',
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
