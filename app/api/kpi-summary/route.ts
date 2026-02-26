import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

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
    const [studentsResult, bmiResult, beneficiariesResult] = await Promise.all([
      // 1. Total students (count only)
      supabase.from('students').select('id, gender, grade_level'),

      // 2. Latest BMI record per student — fetch all records ordered desc,
      //    we deduplicate server-side (Supabase free tier has no DISTINCT ON)
      supabase
        .from('bmi_records')
        .select('student_id, bmi_status, height_for_age_status, measured_at')
        .order('measured_at', { ascending: false }),

      // 3. All feeding program beneficiaries from active programs in one query
      supabase
        .from('feeding_program_beneficiaries')
        .select(`
          student_id,
          bmi_status_at_enrollment,
          height_for_age_status_at_enrollment,
          feeding_programs!inner(status)
        `)
        .eq('feeding_programs.status', 'active'),
    ]);

    if (studentsResult.error) throw studentsResult.error;
    if (bmiResult.error) throw bmiResult.error;
    // beneficiaries query is non-fatal — programs may not exist yet

    const students = studentsResult.data || [];
    const allBmiRecords = bmiResult.data || [];
    const allBeneficiaries = beneficiariesResult.data || [];

    // ── Students ──────────────────────────────────────────────────────────
    const totalStudents = students.length;
    const studentIds = new Set(students.map((s: any) => s.id));

    // ── Latest BMI record per student (deduplicate in JS) ─────────────────
    // Records are already sorted desc by measured_at, so first occurrence = latest
    const latestRecords = new Map<number, any>();
    for (const record of allBmiRecords) {
      if (!latestRecords.has(record.student_id)) {
        latestRecords.set(record.student_id, record);
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

    // ── Feeding program beneficiaries (single query, no loop) ─────────────
    // Deduplicate students across multiple programs
    const enrolledMap = new Map<number, { isPrimary: boolean; isSecondary: boolean }>();

    allBeneficiaries.forEach((b: any) => {
      if (!studentIds.has(b.student_id)) return;

      const hasBadBMI =
        b.bmi_status_at_enrollment === 'Severely Wasted' ||
        b.bmi_status_at_enrollment === 'Wasted';
      const hasBadHFA =
        b.height_for_age_status_at_enrollment === 'Severely Stunted' ||
        b.height_for_age_status_at_enrollment === 'Stunted';

      const isPrimary = hasBadBMI;
      const isSecondary = hasBadHFA && !hasBadBMI;

      if (!enrolledMap.has(b.student_id)) {
        enrolledMap.set(b.student_id, { isPrimary: false, isSecondary: false });
      }
      const entry = enrolledMap.get(b.student_id)!;
      if (isPrimary) entry.isPrimary = true;
      if (isSecondary) entry.isSecondary = true;
    });

    let primaryCount = 0;
    let secondaryCount = 0;
    Array.from(enrolledMap.values()).forEach((val) => {
      if (val.isPrimary) primaryCount++;
      else if (val.isSecondary) secondaryCount++;
    });

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
          total: primaryCount + secondaryCount,
        },
      },
      {
        headers: {
          // Cache for 60 seconds — data changes infrequently
          'Cache-Control': 'private, max-age=60, stale-while-revalidate=120',
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
