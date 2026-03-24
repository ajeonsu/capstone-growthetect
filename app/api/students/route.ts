import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { calculateAge } from '@/lib/helpers';

// GET - Fetch students (active only by default; pass ?archived=true for archived students)
export async function GET(request: NextRequest) {
  try {
    await requireRole('nutritionist', request);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const grade = searchParams.get('grade') || '';
    const gender = searchParams.get('gender') || '';
    const archived = searchParams.get('archived') === 'true';

    const supabase = getSupabaseClient();

    // ── Return archived students ─────────────────────────────────────────────
    if (archived) {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('is_archived', true)
        .order('archived_at', { ascending: false });

      // Column doesn't exist yet — return empty archive
      if (error?.code === '42703' || error?.message?.includes('is_archived')) {
        return NextResponse.json({ success: true, students: [] });
      }
      if (error) throw error;

      return NextResponse.json({ success: true, students: data || [] });
    }

    // ── Return active students ───────────────────────────────────────────────
    // Filter: is_archived = false OR null (null = pre-migration rows, treat as active)
    // If column doesn't exist yet (migration not run), fall back to returning all students.
    const isArchivedFilter = 'is_archived.eq.false,is_archived.is.null';

    const isColumnMissingError = (err: any) =>
      err?.code === '42703' || err?.message?.includes('is_archived');

    if (search) {
      let { data, error } = await supabase
        .from('students')
        .select('*')
        .or(isArchivedFilter);

      // Fallback: column not in DB yet — fetch all without filter
      if (isColumnMissingError(error)) {
        const fallback = await supabase.from('students').select('*');
        data = fallback.data;
        error = fallback.error;
      }
      if (error) throw error;

      let filtered = data || [];
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (s: any) =>
          s.first_name?.toLowerCase().includes(searchLower) ||
          s.last_name?.toLowerCase().includes(searchLower) ||
          s.lrn?.toLowerCase().includes(searchLower)
      );
      if (grade) filtered = filtered.filter((s: any) => s.grade_level === parseInt(grade));
      if (gender) filtered = filtered.filter((s: any) => s.gender === gender);

      filtered.sort((a: any, b: any) => {
        if (a.last_name !== b.last_name) return (a.last_name || '').localeCompare(b.last_name || '');
        return (a.first_name || '').localeCompare(b.first_name || '');
      });

      const studentsWithAge = filtered.map((s: any) => ({
        ...s,
        age: s.birthdate ? calculateAge(s.birthdate) : s.age,
      }));

      return NextResponse.json({ success: true, students: studentsWithAge });
    }

    let baseQuery = supabase.from('students').select('*').or(isArchivedFilter);
    if (grade) baseQuery = baseQuery.eq('grade_level', parseInt(grade));
    if (gender) baseQuery = baseQuery.eq('gender', gender);

    let { data, error } = await baseQuery.order('last_name').order('first_name');

    // Fallback: column not in DB yet — fetch all without filter
    if (isColumnMissingError(error)) {
      let fallbackQuery = supabase.from('students').select('*');
      if (grade) fallbackQuery = fallbackQuery.eq('grade_level', parseInt(grade));
      if (gender) fallbackQuery = fallbackQuery.eq('gender', gender);
      const fallback = await fallbackQuery.order('last_name').order('first_name');
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json(
        { success: false, message: 'Error fetching students' },
        { status: 500 }
      );
    }

    const studentsWithAge = (data || []).map((s: any) => ({
      ...s,
      age: s.birthdate ? calculateAge(s.birthdate) : s.age,
    }));

    return NextResponse.json({ success: true, students: studentsWithAge });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching students:', error);
    return NextResponse.json({ success: false, message: 'Error fetching students' }, { status: 500 });
  }
}

// POST - Create new student
export async function POST(request: NextRequest) {
  try {
    await requireRole('nutritionist', request);

    const body = await request.formData();
    const lrn = body.get('lrn') as string;
    const rfid_uid = body.get('rfid_uid') as string;
    const first_name = body.get('first_name') as string;
    const middle_name = body.get('middle_name') as string;
    const last_name = body.get('last_name') as string;
    const birthdate = body.get('birthdate') as string;
    const age = birthdate ? calculateAge(birthdate) : (parseInt(body.get('age') as string) || 0);
    const gender = body.get('gender') as string;
    const grade_level_raw = body.get('grade_level') as string;
    const grade_level = grade_level_raw !== null && grade_level_raw !== '' ? parseInt(grade_level_raw) : 0;
    const section = body.get('section') as string;
    const address = body.get('address') as string;
    const parent_guardian = body.get('parent_guardian') as string;
    const contact_number = body.get('contact_number') as string;

    if (!first_name || !last_name || !birthdate || !gender || !section) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: First Name, Last Name, Birthdate, Gender, and Section are required.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    const insertData: any = {
      lrn: lrn || `NL-${Math.random().toString(36).slice(2, 11).toUpperCase()}`,
      rfid_uid: rfid_uid || null,
      first_name,
      middle_name: middle_name || null,
      last_name,
      birthdate,
      age: age || null,
      gender,
      grade_level,
      section: section || null,
      address: address || null,
      parent_guardian: parent_guardian || null,
      contact_number: contact_number || null,
    };

    delete insertData.id;
    delete insertData.created_at;
    delete insertData.updated_at;

    const { data, error } = await supabase
      .from('students')
      .insert([insertData])
      .select('id')
      .single();

    if (error) {
      console.error('[STUDENTS] Supabase insert error:', error);
      let errorMessage = 'Error creating student';

      if (error.code === '23505') {
        if (error.message?.includes('lrn')) {
          errorMessage = 'A student with this LRN already exists. Please use a different LRN.';
        } else if (error.message?.includes('rfid_uid')) {
          errorMessage = 'This RFID card is already registered to another student. Please use a different card.';
        } else {
          const { data: maxRecord } = await supabase
            .from('students').select('id').order('id', { ascending: false }).limit(1).single();
          const maxId = maxRecord?.id || 0;
          errorMessage = `Database sequence error. Please run this SQL in Supabase SQL Editor: SELECT setval('students_id_seq', ${maxId + 1}, true);`;
        }
      } else if (error.message?.includes('duplicate key') || error.message?.includes('students_pkey')) {
        const { data: maxRecord } = await supabase
          .from('students').select('id').order('id', { ascending: false }).limit(1).single();
        const maxId = maxRecord?.id || 0;
        errorMessage = `Database sequence error. Please run this SQL in Supabase SQL Editor: SELECT setval('students_id_seq', ${maxId + 1}, true);`;
      } else if (error.message?.includes('null value') || error.message?.includes('not null')) {
        errorMessage = `Missing required field: ${error.message}`;
      } else if (error.message) {
        errorMessage = `Error creating student: ${error.message}`;
      }

      return NextResponse.json(
        { success: false, message: errorMessage, error: error.message, errorCode: error.code },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Student registered successfully',
      student_id: data.id,
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error creating student:', error);
    return NextResponse.json({ success: false, message: 'Error creating student' }, { status: 500 });
  }
}

// PUT - Update student
export async function PUT(request: NextRequest) {
  try {
    await requireRole('nutritionist', request);

    const body = await request.json();
    const id = body.id;
    const lrn = body.lrn;
    const rfid_uid = body.rfid_uid;
    const first_name = body.first_name;
    const middle_name = body.middle_name;
    const last_name = body.last_name;
    const birthdate = body.birthdate;
    const age = birthdate ? calculateAge(birthdate) : (parseInt(body.age) || 0);
    const gender = body.gender;
    const grade_level = parseInt(body.grade_level) || 0;
    const section = body.section;
    const address = body.address;
    const parent_guardian = body.parent_guardian;
    const contact_number = body.contact_number;

    if (!id) {
      return NextResponse.json({ success: false, message: 'Student ID is required' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('students')
      .update({
        lrn: lrn || `NL-${Math.random().toString(36).slice(2, 11).toUpperCase()}`,
        rfid_uid: rfid_uid || null,
        first_name,
        middle_name: middle_name || null,
        last_name,
        birthdate,
        age,
        gender,
        grade_level,
        section: section,
        address: address || null,
        parent_guardian: parent_guardian || null,
        contact_number: contact_number || null,
      })
      .eq('id', id);

    if (error) {
      console.error('Supabase update error:', error);
      return NextResponse.json({ success: false, message: error.message || 'Error updating student' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Student updated successfully' });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error updating student:', error);
    return NextResponse.json({ success: false, message: 'Error updating student' }, { status: 500 });
  }
}

// PATCH - Bulk operations (grade promotion, restore, rollback, bulk insert)
export async function PATCH(request: NextRequest) {
  try {
    await requireRole('nutritionist', request);

    const body = await request.json();
    const { action } = body;

    const supabase = getSupabaseClient();

    // ── Promote all students to next grade ──────────────────────────────────
    if (action === 'promote') {
      const repeatingIds: number[] = Array.isArray(body.repeatingIds) ? body.repeatingIds : [];
      const sessionId = crypto.randomUUID();

      // Fetch all currently active students (handle both false and null for is_archived)
      const { data: allActive, error: fetchAllError } = await supabase
        .from('students')
        .select('id, grade_level')
        .or('is_archived.eq.false,is_archived.is.null');

      if (fetchAllError) {
        return NextResponse.json({ success: false, message: 'Error fetching students for promotion' }, { status: 500 });
      }

      const activeStudents = allActive || [];

      // Archive Grade 6 non-repeaters (graduates) instead of deleting
      const grade6Graduates = activeStudents.filter(
        (s: any) => s.grade_level === 6 && !repeatingIds.includes(s.id)
      );

      if (grade6Graduates.length > 0) {
        const grade6Ids = grade6Graduates.map((s: any) => s.id);
        const { error: archiveError } = await supabase
          .from('students')
          .update({
            is_archived: true,
            archived_at: new Date().toISOString(),
            archive_reason: 'graduated',
            pre_archive_grade_level: 6,
            promotion_session_id: sessionId,
          })
          .in('id', grade6Ids);

        if (archiveError) {
          console.error('[PROMOTE] Archive Grade 6 error:', archiveError);
          return NextResponse.json({ success: false, message: 'Error archiving graduated students' }, { status: 500 });
        }
      }

      // Promote active non-repeating students in grades 0–5
      const toPromote = activeStudents.filter(
        (s: any) => !repeatingIds.includes(s.id) && s.grade_level < 6
      );

      if (toPromote.length > 0) {
        // Group by current grade level (process high→low to avoid conflicts)
        const gradeGroups: Record<number, number[]> = {};
        toPromote.forEach((s: any) => {
          if (!gradeGroups[s.grade_level]) gradeGroups[s.grade_level] = [];
          gradeGroups[s.grade_level].push(s.id);
        });

        for (const gradeStr of Object.keys(gradeGroups).sort((a, b) => Number(b) - Number(a))) {
          const currentGrade = Number(gradeStr);
          const ids = gradeGroups[currentGrade];
          const { error: updateError } = await supabase
            .from('students')
            .update({
              grade_level: currentGrade + 1,
              pre_promotion_grade_level: currentGrade,
              promotion_session_id: sessionId,
              is_archived: false,
            })
            .in('id', ids);

          if (updateError) {
            console.error(`[PROMOTE] Update grade ${currentGrade} error:`, updateError);
            return NextResponse.json(
              { success: false, message: `Error promoting Grade ${currentGrade} students` },
              { status: 500 }
            );
          }
        }
      }

      // Create promotion session record
      const { error: sessionError } = await supabase.from('promotion_sessions').insert({
        id: sessionId,
        total_promoted: toPromote.length,
        total_graduated: grade6Graduates.length,
      });

      if (sessionError) {
        console.error('[PROMOTE] Session insert error:', sessionError);
      }

      return NextResponse.json({
        success: true,
        message: `Promotion complete. ${toPromote.length} student(s) promoted, ${grade6Graduates.length} graduate(s) archived, ${repeatingIds.length} student(s) held back as repeaters.`,
        promoted: toPromote.length,
        graduated: grade6Graduates.length,
        repeating: repeatingIds.length,
        sessionId,
      });
    }

    // ── Restore a single archived student ───────────────────────────────────
    if (action === 'restore') {
      const { id } = body;
      if (!id) return NextResponse.json({ success: false, message: 'Student ID is required' }, { status: 400 });

      // Fetch current student to get pre_archive_grade_level
      const { data: student, error: fetchError } = await supabase
        .from('students')
        .select('pre_archive_grade_level, first_name, last_name')
        .eq('id', id)
        .single();

      if (fetchError || !student) {
        return NextResponse.json({ success: false, message: 'Student not found' }, { status: 404 });
      }

      const { error } = await supabase
        .from('students')
        .update({
          is_archived: false,
          archived_at: null,
          archive_reason: null,
          grade_level: student.pre_archive_grade_level ?? 6,
          pre_archive_grade_level: null,
          promotion_session_id: null,
          pre_promotion_grade_level: null,
        })
        .eq('id', id);

      if (error) {
        console.error('[RESTORE] Error:', error);
        return NextResponse.json({ success: false, message: 'Error restoring student' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `${student.first_name} ${student.last_name} has been restored successfully.`,
      });
    }

    // ── Revert a single promoted (active) student to their pre-promotion grade ─
    if (action === 'revert_student') {
      const { id } = body;
      if (!id) return NextResponse.json({ success: false, message: 'Student ID is required' }, { status: 400 });

      const { data: student, error: fetchError } = await supabase
        .from('students')
        .select('pre_promotion_grade_level, first_name, last_name')
        .eq('id', id)
        .single();

      if (fetchError || !student) {
        return NextResponse.json({ success: false, message: 'Student not found' }, { status: 404 });
      }

      const { error } = await supabase
        .from('students')
        .update({
          grade_level: student.pre_promotion_grade_level,
          promotion_session_id: null,
          pre_promotion_grade_level: null,
        })
        .eq('id', id);

      if (error) {
        console.error('[REVERT_STUDENT] Error:', error);
        return NextResponse.json({ success: false, message: 'Error reverting student grade' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `${student.first_name} ${student.last_name} has been reverted to their previous grade.`,
      });
    }

    // ── Rollback an entire promotion session ────────────────────────────────
    if (action === 'rollback_session') {
      const { sessionId } = body;
      if (!sessionId) return NextResponse.json({ success: false, message: 'Session ID is required' }, { status: 400 });

      // 1. Restore all archived graduates in this session back to Grade 6
      const { data: archivedInSession } = await supabase
        .from('students')
        .select('id')
        .eq('promotion_session_id', sessionId)
        .eq('is_archived', true);

      if (archivedInSession && archivedInSession.length > 0) {
        const archivedIds = archivedInSession.map((s: any) => s.id);
        const { error: restoreError } = await supabase
          .from('students')
          .update({
            is_archived: false,
            archived_at: null,
            archive_reason: null,
            grade_level: 6,
            pre_archive_grade_level: null,
            promotion_session_id: null,
            pre_promotion_grade_level: null,
          })
          .in('id', archivedIds);

        if (restoreError) {
          console.error('[ROLLBACK] Restore archived error:', restoreError);
          return NextResponse.json({ success: false, message: 'Error restoring graduated students' }, { status: 500 });
        }
      }

      // 2. Revert all active promoted students in this session (handle null is_archived)
      const { data: activeInSession } = await supabase
        .from('students')
        .select('id, pre_promotion_grade_level')
        .eq('promotion_session_id', sessionId)
        .or('is_archived.eq.false,is_archived.is.null');

      if (activeInSession && activeInSession.length > 0) {
        // Group by pre_promotion_grade_level for efficient batch updates
        const preGradeGroups: Record<number, number[]> = {};
        activeInSession.forEach((s: any) => {
          const pg = s.pre_promotion_grade_level ?? 0;
          if (!preGradeGroups[pg]) preGradeGroups[pg] = [];
          preGradeGroups[pg].push(s.id);
        });

        for (const [preGrade, ids] of Object.entries(preGradeGroups)) {
          const { error: revertError } = await supabase
            .from('students')
            .update({
              grade_level: Number(preGrade),
              promotion_session_id: null,
              pre_promotion_grade_level: null,
            })
            .in('id', ids);

          if (revertError) {
            console.error('[ROLLBACK] Revert active error:', revertError);
            return NextResponse.json({ success: false, message: 'Error reverting promoted students' }, { status: 500 });
          }
        }
      }

      // 3. Delete the session record
      await supabase.from('promotion_sessions').delete().eq('id', sessionId);

      const restoredCount = archivedInSession?.length ?? 0;
      const revertedCount = activeInSession?.length ?? 0;

      return NextResponse.json({
        success: true,
        message: `Rollback complete. ${restoredCount} graduate(s) restored to Grade 6, ${revertedCount} student(s) reverted to previous grades.`,
      });
    }

    // ── Bulk insert students ─────────────────────────────────────────────────
    if (action === 'bulk_insert') {
      const { students: studentList } = body;

      if (!Array.isArray(studentList) || studentList.length === 0) {
        return NextResponse.json({ success: false, message: 'No students provided' }, { status: 400 });
      }

      const records = studentList.map((s: any) => ({
        lrn: s.lrn || `NL-${Math.random().toString(36).slice(2, 11).toUpperCase()}`,
        rfid_uid: s.rfid_uid || null,
        first_name: s.first_name,
        middle_name: s.middle_name || null,
        last_name: s.last_name,
        birthdate: s.birthdate,
        age: s.birthdate ? calculateAge(s.birthdate) : (parseInt(s.age) || null),
        gender: s.gender,
        grade_level: s.grade_level !== undefined ? parseInt(s.grade_level) : 0,
        section: s.section || null,
        address: s.address || null,
        parent_guardian: s.parent_guardian || null,
        contact_number: s.contact_number || null,
      }));

      const { data, error } = await supabase.from('students').insert(records).select('id');

      if (error) {
        console.error('[BULK INSERT] Supabase error:', error);
        let msg = 'Error inserting students';
        if (error.code === '23505') {
          if (error.message?.includes('lrn')) msg = 'One or more LRNs already exist. Please check for duplicates.';
          else if (error.message?.includes('rfid_uid')) msg = 'One or more RFID UIDs are already registered.';
          else msg = `Duplicate value error: ${error.message}`;
        } else {
          msg = error.message || 'Error inserting students';
        }
        return NextResponse.json({ success: false, message: msg }, { status: 500 });
      }

      const gradeValue = records[0]?.grade_level ?? 0;
      const gradeLabel = gradeValue === 0 ? 'Kinder' : `Grade ${gradeValue}`;
      return NextResponse.json({
        success: true,
        message: `${data?.length ?? studentList.length} ${gradeLabel} students registered successfully.`,
        inserted: data?.length ?? studentList.length,
      });
    }

    return NextResponse.json({ success: false, message: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error in PATCH /api/students:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Archive a student (soft delete); pass ?permanent=true to hard-delete an already-archived student
export async function DELETE(request: NextRequest) {
  try {
    await requireRole('nutritionist', request);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const permanent = searchParams.get('permanent') === 'true';

    if (!id) {
      return NextResponse.json({ success: false, message: 'Student ID is required' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // Hard delete — only allowed for already-archived students
    if (permanent) {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id)
        .eq('is_archived', true);

      if (error) {
        console.error('Supabase permanent delete error:', error);
        return NextResponse.json({ success: false, message: 'Error permanently deleting student' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Student permanently removed.' });
    }

    // Soft archive — fetch current grade level first (also set is_archived=false explicitly for pre-migration nulls)
    const { data: student, error: fetchError } = await supabase
      .from('students')
      .select('grade_level, first_name, last_name')
      .eq('id', id)
      .single();

    if (fetchError || !student) {
      return NextResponse.json({ success: false, message: 'Student not found' }, { status: 404 });
    }

    const { error } = await supabase
      .from('students')
      .update({
        is_archived: true,
        archived_at: new Date().toISOString(),
        archive_reason: 'deleted',
        pre_archive_grade_level: student.grade_level,
      })
      .eq('id', id);

    if (error) {
      console.error('Supabase archive error:', error);
      return NextResponse.json({ success: false, message: 'Error archiving student' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `${student.first_name} ${student.last_name} has been moved to the archive.`,
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error deleting student:', error);
    return NextResponse.json({ success: false, message: 'Error archiving student' }, { status: 500 });
  }
}
