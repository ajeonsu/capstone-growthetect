import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// Helper function to get BMI distribution
async function getBMIDistribution(supabase: any, grade: number | null = null) {
  // Get all BMI records with latest per student
  let query = supabase
    .from('bmi_records')
    .select('student_id, bmi_status, measured_at, students!inner(grade_level)');

  const { data: allRecords, error } = await query;

  if (error) {
    console.error('Error fetching BMI records:', error);
    return {};
  }

  // Get latest record per student
  const latestByStudent = new Map();
  allRecords?.forEach((record: any) => {
    const studentId = record.student_id;
    const existing = latestByStudent.get(studentId);
    if (!existing || new Date(record.measured_at) > new Date(existing.measured_at)) {
      latestByStudent.set(studentId, record);
    }
  });

  // Filter by grade if specified
  let filteredRecords = Array.from(latestByStudent.values());
  if (grade !== null && grade !== undefined) {
    filteredRecords = filteredRecords.filter(
      (record: any) => record.students?.grade_level === grade
    );
  }

  // Count by BMI status
  const distribution: Record<string, number> = {};
  filteredRecords.forEach((record: any) => {
    const status = record.bmi_status;
    distribution[status] = (distribution[status] || 0) + 1;
  });

  return distribution;
}

// Helper function to get recent BMI records
async function getRecentBMIRecords(supabase: any, grade: number | null = null, limit = 100) {
  let query = supabase
    .from('bmi_records')
    .select('*, students!inner(first_name, last_name, lrn, grade_level)')
    .order('measured_at', { ascending: false })
    .limit(limit);

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching recent BMI records:', error);
    return [];
  }

  // Get latest per student
  const latestByStudent = new Map();
  data?.forEach((record: any) => {
    const studentId = record.student_id;
    const existing = latestByStudent.get(studentId);
    if (!existing || new Date(record.measured_at) > new Date(existing.measured_at)) {
      latestByStudent.set(studentId, record);
    }
  });

  let records = Array.from(latestByStudent.values());

  // Filter by grade if specified
  if (grade !== null && grade !== undefined) {
    records = records.filter((record: any) => record.students?.grade_level === grade);
  }

  // Flatten structure
  return records.map((record: any) => ({
    ...record,
    first_name: record.students?.first_name,
    last_name: record.students?.last_name,
    lrn: record.students?.lrn,
  }));
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'nutritionist';
    const grade = searchParams.get('grade');

    const supabase = getSupabaseClient();
    const gradeFilter = grade && grade !== 'all' ? parseInt(grade) : null;

    if (type === 'nutritionist') {
      // Get total students
      let studentsQuery = supabase.from('students').select('id', { count: 'exact', head: true });
      if (gradeFilter !== null) {
        studentsQuery = supabase.from('students').select('id', { count: 'exact', head: true }).eq('grade_level', gradeFilter);
      }
      const { count: total_students } = await studentsQuery;

      // Get BMI distribution
      const bmi_distribution = await getBMIDistribution(supabase, gradeFilter);

      // Get active feeding programs
      const { count: active_programs } = await supabase
        .from('feeding_programs')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active');

      // Get recent records
      const recent_records = await getRecentBMIRecords(supabase, gradeFilter);

      return NextResponse.json({
        success: true,
        total_students: total_students || 0,
        bmi_distribution,
        active_programs: active_programs || 0,
        recent_records,
      });
    } else {
      // Administrator dashboard — run all independent queries in parallel
      const [
        { count: pending_reports },
        { count: total_students },
        bmi_distribution,
        { data: pending_reports_list },
        { data: approved_reports_list },
      ] = await Promise.all([
        supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('students').select('id', { count: 'exact', head: true }),
        getBMIDistribution(supabase),
        supabase
          .from('reports')
          .select('id, title, report_type, description, status, pdf_file, generated_at, generated_by, data')
          .eq('status', 'pending')
          .order('generated_at', { ascending: false })
          .limit(100),
        supabase
          .from('reports')
          .select('id, title, report_type, description, status, pdf_file, generated_at, reviewed_at, review_notes, generated_by, data')
          .in('status', ['approved', 'rejected'])
          .order('reviewed_at', { ascending: false })
          .limit(20),
      ]);

      // Enrich reports with author names (single query per batch)
      const enrichWithNames = async (reports: any[]) => {
        if (!reports || reports.length === 0) return reports || [];
        const uniqueIds: any[] = [];
        reports.forEach((r: any) => { if (r.generated_by && !uniqueIds.includes(r.generated_by)) uniqueIds.push(r.generated_by); });
        const userIds = uniqueIds;
        if (userIds.length === 0) return reports;
        const { data: users } = await supabase.from('users').select('id, name').in('id', userIds);
        const userMap = new Map(users?.map((u: any) => [u.id, u.name]) || []);
        return reports.map((r: any) => ({ ...r, users: { name: userMap.get(r.generated_by) } }));
      };

      const [enrichedPending, enrichedApproved] = await Promise.all([
        enrichWithNames(pending_reports_list || []),
        enrichWithNames(approved_reports_list || []),
      ]);

      return NextResponse.json({
        success: true,
        pending_reports: pending_reports || 0,
        total_students: total_students || 0,
        bmi_distribution,
        pending_reports_list: enrichedPending.map((r: any) => ({ ...r, generated_by_name: r.users?.name })),
        approved_reports_list: enrichedApproved.map((r: any) => ({ ...r, generated_by_name: r.users?.name })),
      });
    }
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { success: false, message: 'Error fetching dashboard data' },
      { status: 500 }
    );
  }
}
