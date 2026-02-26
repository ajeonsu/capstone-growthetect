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
    const [studentsResult, bmiResult, beneficiariesResult] = await Promise.all([
      // 1. Total students
      supabase.from('students').select('id, gender, grade_level'),

      // 2. Latest BMI record per student — fetch all records ordered desc,
      //    we deduplicate server-side (Supabase free tier has no DISTINCT ON)
      supabase
        .from('bmi_records')
        .select('student_id, bmi_status, height_for_age_status, measured_at')
        .order('measured_at', { ascending: false }),

      // 3. All beneficiaries with their program's status + end_date so we can
      //    filter "truly active" programs entirely in JavaScript (avoids .in()
      //    / .eq() filter issues on joined tables in Supabase free tier).
      supabase
        .from('feeding_program_beneficiaries')
        .select('student_id, feeding_programs(status, end_date)'),
    ]);

    if (studentsResult.error) throw studentsResult.error;
    if (bmiResult.error) throw bmiResult.error;

    const students = studentsResult.data || [];
    const allBmiRecords = bmiResult.data || [];

    // Filter beneficiaries whose program is truly active:
    //   status = 'active' AND (no end_date OR end_date >= today)
    // Note: the program page computes "ended" from end_date dynamically but may
    // not always update the DB status column, so we check end_date here too.
    const today = new Date();
    const allBeneficiaries = (beneficiariesResult.data || []).filter((b: any) => {
      const prog = b.feeding_programs;
      if (!prog) return false;
      if (prog.status !== 'active') return false;
      if (prog.end_date && new Date(prog.end_date) < today) return false;
      return true;
    });

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

    // ── Feeding Program KPI ───────────────────────────────────────────────
    // Primary   = ALL students whose CURRENT BMI is Severely Wasted / Wasted
    // Secondary = ALL students whose CURRENT HFA is Stunted / Severely Stunted
    //             AND whose BMI is NOT in the primary category
    // These counts are independent of enrollment — they show who needs support.
    //
    // Total Enrolled = unique students actually enrolled in active programs.

    let primaryCount = 0;
    let secondaryCount = 0;

    Array.from(latestRecords.values()).forEach((record: any) => {
      const hasBadBMI =
        record.bmi_status === 'Severely Wasted' || record.bmi_status === 'Wasted';
      const hasBadHFA =
        record.height_for_age_status === 'Severely Stunted' ||
        record.height_for_age_status === 'Stunted';

      if (hasBadBMI) {
        primaryCount++;
      } else if (hasBadHFA) {
        secondaryCount++;
      }
    });

    // Total enrolled = unique students in active feeding programs
    const totalEnrolled = allBeneficiaries.length > 0
      ? new Set(allBeneficiaries.map((b: any) => Number(b.student_id))).size
      : 0;

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
