import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/db';
import { requireRole } from '@/lib/auth';

// GET - Fetch all promotion sessions with their associated students
export async function GET(request: NextRequest) {
  try {
    await requireRole('nutritionist', request);

    const supabase = getSupabaseClient();

    const { data: sessions, error } = await supabase
      .from('promotion_sessions')
      .select('*')
      .order('promoted_at', { ascending: false });

    // Table doesn't exist yet (migration not run) — return empty list
    if (error?.code === 'PGRST205' || error?.message?.includes('promotion_sessions')) {
      return NextResponse.json({ success: true, sessions: [] });
    }
    if (error) throw error;

    // For each session, attach the students involved
    const sessionsWithStudents = await Promise.all(
      (sessions || []).map(async (session: any) => {
        const { data: students } = await supabase
          .from('students')
          .select('id, first_name, middle_name, last_name, grade_level, gender, is_archived, archive_reason, pre_archive_grade_level, pre_promotion_grade_level')
          .eq('promotion_session_id', session.id)
          .order('last_name')
          .order('first_name');

        return { ...session, students: students || [] };
      })
    );

    return NextResponse.json({ success: true, sessions: sessionsWithStudents });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching promotion sessions:', error);
    return NextResponse.json(
      { success: false, message: 'Error fetching promotion sessions' },
      { status: 500 }
    );
  }
}
