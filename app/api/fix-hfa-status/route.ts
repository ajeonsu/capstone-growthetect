import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { getHeightForAgeStatus } from '@/lib/helpers';

export const dynamic = 'force-dynamic';

async function updateHFAStatus(request: NextRequest) {
  try {
    await requireRole('nutritionist', request);
    const supabase = getSupabaseClient();

    console.log('[FIX HFA] Starting HFA status backfill...');

    // Get all BMI records
    const { data: bmiRecords, error: bmiError } = await supabase
      .from('bmi_records')
      .select('id, student_id, height, measured_at');

    if (bmiError || !bmiRecords) {
      console.error('[FIX HFA] Error fetching BMI records:', bmiError);
      return NextResponse.json(
        { success: false, message: 'Error fetching BMI records' },
        { status: 500 }
      );
    }

    console.log(`[FIX HFA] Found ${bmiRecords.length} BMI records`);

    // Get all students to get their ages
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, age, birthdate');

    if (studentsError || !students) {
      console.error('[FIX HFA] Error fetching students:', studentsError);
      return NextResponse.json(
        { success: false, message: 'Error fetching students' },
        { status: 500 }
      );
    }

    const studentMap = new Map(students.map((s: any) => [s.id, s]));
    let updatedCount = 0;
    let errors = 0;

    // Update each record
    for (const record of bmiRecords) {
      const student = studentMap.get(record.student_id);
      if (!student) {
        console.log(`[FIX HFA] Student not found for record ${record.id}`);
        continue;
      }

      // Calculate age at time of measurement
      let ageYears = student.age || 0;
      if (student.birthdate && record.measured_at) {
        const birthDate = new Date(student.birthdate);
        const measuredDate = new Date(record.measured_at);
        let totalMonths = (measuredDate.getFullYear() - birthDate.getFullYear()) * 12;
        totalMonths += measuredDate.getMonth() - birthDate.getMonth();
        if (measuredDate.getDate() < birthDate.getDate()) {
          totalMonths--;
        }
        ageYears = Math.floor(totalMonths / 12);
      }

      // Calculate HFA status
      const hfaStatus = getHeightForAgeStatus(record.height, ageYears);

      // Update the record
      const { error: updateError } = await supabase
        .from('bmi_records')
        .update({ height_for_age_status: hfaStatus })
        .eq('id', record.id);

      if (updateError) {
        console.error(`[FIX HFA] Error updating record ${record.id}:`, updateError);
        errors++;
      } else {
        updatedCount++;
        console.log(`[FIX HFA] Updated record ${record.id}: height=${record.height}cm, age=${ageYears}y → ${hfaStatus}`);
      }
    }

    console.log(`[FIX HFA] Complete! Updated ${updatedCount} records, ${errors} errors`);

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${updatedCount} BMI records with HFA status`,
      updated: updatedCount,
      errors: errors,
      total: bmiRecords.length,
    });
  } catch (error: any) {
    console.error('[FIX HFA] Error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred', error: error?.message },
      { status: 500 }
    );
  }
}

// Allow both GET and POST to trigger the update
export async function GET(request: NextRequest) {
  return updateHFAStatus(request);
}

export async function POST(request: NextRequest) {
  return updateHFAStatus(request);
}
