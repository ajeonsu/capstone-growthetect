import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/kpi-summary
 * Returns all KPI data in a single request:
 * - Total students + pupilsWeighed
 * - BMI status counts (latest record per student)
 * - HFA status counts
 * - Feeding program primary/secondary/total beneficiary counts
 *
 * Replaces the previous pattern of 3+ sequential fetches + N+1 per-program loop.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);

    const supabase = getSupabaseClient();

    // Run all independent queries in parallel
    const [studentsResult, bmiResult, activeProgramsResult] = await Promise.all([
      // 1. Total students
      supabase.from('students').select('id, gender, grade_level'),

      // 2. Latest BMI record per student — fetch all records ordered desc,
      //    we deduplicate server-side (Supabase free tier has no DISTINCT ON)
      supabase
        .from('bmi_records')
        .select('student_id, bmi_status, height_for_age_status, measured_at')
        .order('measured_at', { ascending: false }),

      // 3. Get active feeding program IDs first (safe two-step approach)
      supabase
        .from('feeding_programs')
        .select('id')
        .eq('status', 'active'),
    ]);

    if (studentsResult.error) throw studentsResult.error;
    if (bmiResult.error) throw bmiResult.error;
    // activeProgramsResult error is non-fatal; just means no active programs yet

    const students = studentsResult.data || [];
    const allBmiRecords = bmiResult.data || [];

    // Fetch beneficiaries for active programs
    // Use ALL programs (not just active) so nothing is missed during status transitions
    const activeProgramIds = (activeProgramsResult.data || []).map((p: any) => Number(p.id));
    let allBeneficiaries: any[] = [];

    if (activeProgramIds.length > 0) {
      const beneficiariesResult = await supabase
        .from('feeding_program_beneficiaries')
        .select('student_id, bmi_status_at_enrollment, height_for_age_status_at_enrollment')
        .in('feeding_program_id', activeProgramIds);

      if (!beneficiariesResult.error) {
        allBeneficiaries = beneficiariesResult.data || [];
      }
    } else {
      // Fallback: fetch ALL beneficiaries regardless of program status
      const beneficiariesResult = await supabase
        .from('feeding_program_beneficiaries')
        .select('student_id, bmi_status_at_enrollment, height_for_age_status_at_enrollment');

      if (!beneficiariesResult.error) {
        allBeneficiaries = beneficiariesResult.data || [];
      }
    }

    // ── Students ──────────────────────────────────────────────────────────
    const totalStudents = students.length;
    // Coerce to Number to avoid string vs. number type mismatch in Set.has()
    const studentIds = new Set(students.map((s: any) => Number(s.id)));

    // ── Latest BMI record per student (deduplicate in JS) ─────────────────
    // Records are already sorted desc by measured_at, so first occurrence = latest
    const latestRecords = new Map<number, any>();
    for (const record of allBmiRecords) {
      const sid = Number(record.student_id);
      if (!latestRecords.has(sid)) {
        latestRecords.set(sid, record);
      }
    }
    const pupilsWeighed = latestRecords.size;

    // BMI status counts
    const bmiCounts = {
      severelyWasted: 0,
      wasted: 0,
      underweight: 0,
      normal: 0,
      overweight: 0,
      obese: 0,
    };

    // HFA status counts
    const hfaCounts = {
      severelyStunted: 0,
      stunted: 0,
      normal: 0,
      tall: 0,
    };

    Array.from(latestRecords.values()).forEach((record: any) => {
      switch (record.bmi_status) {
        case 'Severely Wasted': bmiCounts.severelyWasted++; break;
        case 'Wasted':          bmiCounts.wasted++;         break;
        case 'Underweight':     bmiCounts.underweight++;    break;
        case 'Normal':          bmiCounts.normal++;         break;
        case 'Overweight':      bmiCounts.overweight++;     break;
        case 'Obese':           bmiCounts.obese++;          break;
      }
      switch (record.height_for_age_status) {
        case 'Severely Stunted': hfaCounts.severelyStunted++; break;
        case 'Stunted':          hfaCounts.stunted++;         break;
        case 'Normal':           hfaCounts.normal++;          break;
        case 'Tall':             hfaCounts.tall++;            break;
      }
    });

    // ── Feeding program beneficiaries ─────────────────────────────────────
    // bmi_status_at_enrollment is often null (not stored at enrollment time),
    // so we use the student's CURRENT BMI/HFA from latestRecords instead.
    // Deduplicate students enrolled across multiple programs.
    const enrolledMap = new Map<number, { isPrimary: boolean; isSecondary: boolean }>();

    allBeneficiaries.forEach((b: any) => {
      const sid = Number(b.student_id);
      if (!studentIds.has(sid)) return;

      // Try stored-at-enrollment status first; fall back to current status
      const currentRecord = latestRecords.get(sid);
      const bmiStatus =
        b.bmi_status_at_enrollment || currentRecord?.bmi_status || '';
      const hfaStatus =
        b.height_for_age_status_at_enrollment || currentRecord?.height_for_age_status || '';

      const hasBadBMI = bmiStatus === 'Severely Wasted' || bmiStatus === 'Wasted';
      const hasBadHFA = hfaStatus === 'Severely Stunted' || hfaStatus === 'Stunted';

      const isPrimary = hasBadBMI;
      const isSecondary = hasBadHFA && !hasBadBMI;

      if (!enrolledMap.has(sid)) {
        enrolledMap.set(sid, { isPrimary: false, isSecondary: false });
      }
      const entry = enrolledMap.get(sid)!;
      if (isPrimary) entry.isPrimary = true;
      if (isSecondary) entry.isSecondary = true;
    });

    let primaryCount = 0;
    let secondaryCount = 0;
    Array.from(enrolledMap.values()).forEach((val) => {
      if (val.isPrimary) primaryCount++;
      else if (val.isSecondary) secondaryCount++;
    });

    // Total enrolled = ALL unique students in active programs (regardless of status category)
    const totalEnrolled = enrolledMap.size;

    return NextResponse.json(
      {
        success: true,
        totalStudents,
        pupilsWeighed,
        bmiCounts,
        hfaCounts,
        feedingProgram: {
          primary: primaryCount,
          secondary: secondaryCount,
          total: totalEnrolled,
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching KPI summary:', error);
    return NextResponse.json(
      { success: false, message: 'Error fetching KPI summary' },
      { status: 500 }
    );
  }
}
