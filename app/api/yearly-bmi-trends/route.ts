import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/yearly-bmi-trends
 *
 * Groups ALL BMI records by Philippine academic year (June–May).
 *   - Sept 2024  → SY 2024-2025
 *   - March 2026 → SY 2025-2026  (month < 6 ⇒ startYear = 2025)
 *
 * For each year: takes the LATEST record per student (end-of-year snapshot).
 * Returns at most the 5 most recent school years (oldest drops off automatically).
 */

function academicYear(date: Date): { label: string; sortKey: string } {
  const y = date.getFullYear();
  const m = date.getMonth() + 1; // 1-based
  // Academic year starts in June; if the month is before June it belongs to
  // the year that started the previous calendar year.
  const startYear = m >= 6 ? y : y - 1;
  return {
    label:   `SY ${startYear}-${startYear + 1}`,
    sortKey: `${startYear}`,
  };
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    const supabase = getSupabaseClient();

    const { data: allRecords, error } = await supabase
      .from('bmi_records')
      .select('student_id, bmi_status, measured_at')
      .order('measured_at', { ascending: true });

    if (error) throw error;
    if (!allRecords || allRecords.length === 0) {
      return NextResponse.json({ success: true, schoolYears: [] });
    }

    // ── Group records by academic year ────────────────────────────────────────
    const yearMap = new Map<
      string,
      { label: string; sortKey: string; records: any[] }
    >();

    for (const r of allRecords) {
      const ay = academicYear(new Date(r.measured_at));
      if (!yearMap.has(ay.label)) {
        yearMap.set(ay.label, { ...ay, records: [] });
      }
      yearMap.get(ay.label)!.records.push(r);
    }

    // Sort oldest → newest, keep only the 5 most recent
    const sorted = Array.from(yearMap.values())
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .slice(-5);

    // ── Aggregate per year ────────────────────────────────────────────────────
    const schoolYears = sorted.map((group) => {
      // Latest record per student within this academic year
      const latestPerStudent = new Map<number, any>();
      for (const r of group.records) {
        const sid = Number(r.student_id);
        const ex = latestPerStudent.get(sid);
        if (!ex || new Date(r.measured_at) > new Date(ex.measured_at)) {
          latestPerStudent.set(sid, r);
        }
      }

      let severelyWasted = 0, wasted = 0, normal = 0, overweight = 0, obese = 0;
      for (const r of Array.from(latestPerStudent.values())) {
        switch (r.bmi_status) {
          case 'Severely Wasted': severelyWasted++; break;
          case 'Wasted':          wasted++;         break;
          case 'Normal':          normal++;         break;
          case 'Overweight':      overweight++;     break;
          case 'Obese':           obese++;          break;
        }
      }

      return {
        label: group.label,
        severelyWasted,
        wasted,
        normal,
        overweight,
        obese,
        total: latestPerStudent.size,
      };
    });

    return NextResponse.json(
      { success: true, schoolYears },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching yearly BMI trends:', error);
    return NextResponse.json(
      { success: false, message: 'Error fetching yearly BMI trends' },
      { status: 500 }
    );
  }
}
