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
    const { report_id, program_id, program_name, start_date, end_date, school_name, school_year } = body;

    console.log('[FEEDING PROGRAM REPORT] Generating report for program:', program_id);

    // Fetch program details
    const { data: program, error: programError } = await supabase
      .from('feeding_programs')
      .select('*')
      .eq('id', program_id)
      .single();

    if (programError || !program) {
      console.error('Error fetching program:', programError);
      return NextResponse.json(
        { success: false, message: 'Error fetching program' },
        { status: 500 }
      );
    }

    // Fetch beneficiaries with student details
    const { data: beneficiaries, error: beneficiariesError } = await supabase
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
          grade_level,
          birthdate
        )
      `)
      .eq('feeding_program_id', program_id)
      .order('enrollment_date', { ascending: false });

    if (beneficiariesError) {
      console.error('Error fetching beneficiaries:', beneficiariesError);
      return NextResponse.json(
        { success: false, message: 'Error fetching beneficiaries' },
        { status: 500 }
      );
    }

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

    // Get BMI data for each beneficiary
    const processedBeneficiaries = await Promise.all(
      (beneficiaries || []).map(async (beneficiary: any) => {
        const student = beneficiary.students || {};

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

        // Get latest BMI (current)
        const { data: latestBMI } = await supabase
          .from('bmi_records')
          .select('bmi, bmi_status, measured_at')
          .eq('student_id', beneficiary.student_id)
          .order('measured_at', { ascending: false })
          .limit(1)
          .single();

        // Get BMI at enrollment
        const { data: enrollmentBMI } = await supabase
          .from('bmi_records')
          .select('bmi, bmi_status, measured_at')
          .eq('student_id', beneficiary.student_id)
          .lte('measured_at', beneficiary.enrollment_date)
          .order('measured_at', { ascending: false })
          .limit(1)
          .single();

        // Calculate growth status
        const baselineStatus = enrollmentBMI?.bmi_status || 'N/A';
        const currentStatus = latestBMI?.bmi_status || 'N/A';
        let growthStatus = 'N/A';

        if (baselineStatus !== 'N/A' && currentStatus !== 'N/A') {
          // If current BMI status is obese or overweight, it's overdone
          if (currentStatus === 'Obese' || currentStatus === 'Overweight') {
            growthStatus = 'Overdone';
          } else {
            // Define severity levels
            const statusLevels: Record<string, number> = {
              'Severely Wasted': 1,
              'Wasted': 2,
              'Underweight': 3,
              'Normal': 4,
              'Overweight': 5,
              'Obese': 6,
            };

            const baselineLevel = statusLevels[baselineStatus] || 0;
            const currentLevel = statusLevels[currentStatus] || 0;

            if (currentLevel > baselineLevel && currentLevel <= 4) {
              growthStatus = 'Improve';
            } else if (currentLevel <= baselineLevel) {
              growthStatus = 'No/Decline';
            } else if (currentLevel > 4) {
              growthStatus = 'Overdone';
            }
          }
        }

        return {
          name: fullName,
          grade: gradeMap[student.grade_level] || 'Unknown',
          age: student.age || 'N/A',
          enrollmentDate: new Date(beneficiary.enrollment_date).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit' 
          }),
          bmiAtEnrollment: enrollmentBMI?.bmi?.toFixed(2) || 'N/A',
          bmiStatusAtEnrollment: enrollmentBMI?.bmi_status || 'N/A',
          currentBmi: latestBMI?.bmi?.toFixed(2) || 'N/A',
          currentBmiStatus: latestBMI?.bmi_status || 'N/A',
          growthStatus: growthStatus,
        };
      })
    );

    console.log(`[FEEDING PROGRAM REPORT] Processed ${processedBeneficiaries.length} beneficiaries`);

    const preparedBy = user.name || user.email || 'Nutritionist';

    // Check if program is ended
    const currentDate = new Date();
    const programEndDate = new Date(end_date || program.end_date);
    const isEnded = currentDate > programEndDate || program.status === 'ended';

    return NextResponse.json({
      success: true,
      message: 'Feeding program report data generated successfully',
      pdf_data: {
        title: body.title || `Feeding Program: ${program_name}`,
        programName: program_name || program.name,
        startDate: new Date(start_date || program.start_date).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        endDate: new Date(end_date || program.end_date).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        description: program.description || '',
        schoolName: school_name || 'SCIENCE CITY OF MUNOZ',
        schoolYear: school_year || '2025-2026',
        beneficiaries: processedBeneficiaries,
        totalBeneficiaries: processedBeneficiaries.length,
        preparedBy: preparedBy,
        isEnded: isEnded,
      },
    });
  } catch (error: any) {
    console.error('[FEEDING PROGRAM REPORT] Error:', error);
    return NextResponse.json(
      { success: false, message: 'Error generating feeding program report data', error: error?.message },
      { status: 500 }
    );
  }
}
