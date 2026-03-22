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

    // Fetch program details — may be null if the program was already deleted after report generation
    const { data: program, error: programError } = await supabase
      .from('feeding_programs')
      .select('*')
      .eq('id', program_id)
      .single();

    // If the program row is gone, build a minimal stand-in from the request body data
    // so the PDF can still be rendered (program was deleted after report was generated)
    const programData = program || {
      id: program_id,
      name: program_name,
      start_date: start_date,
      end_date: end_date,
      description: '',
      status: 'ended',
    };

    if (programError && !program) {
      console.warn('[FEEDING PROGRAM REPORT] Program not found in DB (likely deleted after report was generated). Using stored report data instead.');
    }

    // Fetch beneficiaries — will be empty if the program was deleted (cascade)
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
      console.warn('[FEEDING PROGRAM REPORT] Could not fetch beneficiaries (may have been cascade-deleted):', beneficiariesError);
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
        const enrollmentDateEnd = (beneficiary.enrollment_date || '').split('T')[0] + 'T23:59:59';
        const { data: enrollmentBMI } = await supabase
          .from('bmi_records')
          .select('bmi, bmi_status, measured_at')
          .eq('student_id', beneficiary.student_id)
          .lte('measured_at', enrollmentDateEnd)
          .order('measured_at', { ascending: false })
          .limit(1)
          .single();

        // Calculate growth status
        const statusLevels: Record<string, number> = {
          'Severely Wasted': 1,
          'Wasted': 2,
          'Underweight': 3,
          'Normal': 4,
          'Overweight': 5,
          'Obese': 6,
        };
        const baselineStatus = enrollmentBMI?.bmi_status || null;
        const currentStatus  = latestBMI?.bmi_status  || null;
        let growthStatus = 'N/A';

        if (baselineStatus && currentStatus) {
          const baselineLevel = statusLevels[baselineStatus] ?? 0;
          const currentLevel  = statusLevels[currentStatus]  ?? 0;
          if (baselineLevel > 0 && currentLevel > 0) {
            if (currentLevel > 4)                             growthStatus = 'Overdone';
            else if (currentLevel === 4 && baselineLevel < 4) growthStatus = 'Recovered';
            else if (currentLevel > baselineLevel)            growthStatus = 'Improved';
            else if (currentLevel === baselineLevel)          growthStatus = 'Maintained';
            else                                              growthStatus = 'Not Improved';
          }
        }

        const programStart = start_date || programData.start_date;
        const programEnd = end_date || programData.end_date;
        return {
          name: fullName,
          grade: gradeMap[student.grade_level] || 'Unknown',
          age: student.age || 'N/A',
          feedingStartDate: new Date(programStart).toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          }),
          feedingEndDate: new Date(programEnd).toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
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
    const programEndDate = new Date(end_date || programData.end_date);
    const isEnded = currentDate > programEndDate || programData.status === 'ended';

    return NextResponse.json({
      success: true,
      message: 'Feeding program report data generated successfully',
      pdf_data: {
        title: body.title || `Feeding Program: ${program_name}`,
        programName: program_name || programData.name,
        startDate: new Date(start_date || programData.start_date).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        endDate: new Date(end_date || programData.end_date).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        description: programData.description || '',
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
