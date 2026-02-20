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
      // Administrator dashboard
      // Get pending reports count
      const { count: pending_reports } = await supabase
        .from('reports')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Get total students
      const { count: total_students } = await supabase
        .from('students')
        .select('id', { count: 'exact', head: true });

      // Get BMI distribution
      const bmi_distribution = await getBMIDistribution(supabase);

      // Get pending reports list (without join - fetch user data separately)
      const { data: pending_reports_list, error: pendingError } = await supabase
        .from('reports')
        .select('*')
        .eq('status', 'pending')
        .order('generated_at', { ascending: false })
        .limit(100);

      console.log('[DASHBOARD] Pending reports query result:', {
        count: pending_reports_list?.length || 0,
        hasError: !!pendingError,
        errorMessage: pendingError?.message,
        sampleReports: pending_reports_list?.slice(0, 2),
      });

      // Fetch user names separately if we have reports
      if (pending_reports_list && pending_reports_list.length > 0) {
        const userIds = pending_reports_list.map(r => r.generated_by).filter(Boolean);
        if (userIds.length > 0) {
          const { data: users } = await supabase
            .from('users')
            .select('id, name')
            .in('id', userIds);
          
          // Add user names to reports
          const userMap = new Map(users?.map(u => [u.id, u.name]) || []);
          pending_reports_list.forEach((report: any) => {
            report.users = { name: userMap.get(report.generated_by) };
          });
        }
      }

      // Get approved reports list (without join - fetch user data separately)
      const { data: approved_reports_list } = await supabase
        .from('reports')
        .select('*')
        .in('status', ['approved', 'rejected'])
        .order('reviewed_at', { ascending: false })
        .limit(20);

      // Fetch user names for approved reports
      if (approved_reports_list && approved_reports_list.length > 0) {
        const userIds = approved_reports_list.map(r => r.generated_by).filter(Boolean);
        if (userIds.length > 0) {
          const { data: users } = await supabase
            .from('users')
            .select('id, name')
            .in('id', userIds);
          
          // Add user names to reports
          const userMap = new Map(users?.map(u => [u.id, u.name]) || []);
          approved_reports_list.forEach((report: any) => {
            report.users = { name: userMap.get(report.generated_by) };
          });
        }
      }

      // Flatten the structure
      const pendingList = (pending_reports_list || []).map((r: any) => ({
        ...r,
        generated_by_name: r.users?.name,
      }));

      const approvedList = (approved_reports_list || []).map((r: any) => ({
        ...r,
        generated_by_name: r.users?.name,
      }));

      return NextResponse.json({
        success: true,
        pending_reports: pending_reports || 0,
        total_students: total_students || 0,
        bmi_distribution,
        pending_reports_list: pendingList,
        approved_reports_list: approvedList,
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
