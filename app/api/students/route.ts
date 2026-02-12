import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/db';
import { requireRole } from '@/lib/auth';

// GET - Fetch students
export async function GET(request: NextRequest) {
  try {
    await requireRole('nutritionist', request);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const grade = searchParams.get('grade') || '';
    const gender = searchParams.get('gender') || '';

    const supabase = getSupabaseClient();

    let query = supabase.from('students').select('*');

    if (search) {
      // Supabase doesn't support OR in filters directly, so we'll filter in code
      // For better performance, you could use a database function
      const { data, error } = await query;
      if (error) throw error;

      let filtered = data || [];
      if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(
          (s: any) =>
            s.first_name?.toLowerCase().includes(searchLower) ||
            s.last_name?.toLowerCase().includes(searchLower) ||
            s.lrn?.toLowerCase().includes(searchLower)
        );
      }
      if (grade) {
        filtered = filtered.filter((s: any) => s.grade_level === parseInt(grade));
      }
      if (gender) {
        filtered = filtered.filter((s: any) => s.gender === gender);
      }

      // Sort
      filtered.sort((a: any, b: any) => {
        if (a.last_name !== b.last_name) {
          return (a.last_name || '').localeCompare(b.last_name || '');
        }
        return (a.first_name || '').localeCompare(b.first_name || '');
      });

      return NextResponse.json({
        success: true,
        students: filtered,
      });
    }

    if (grade) {
      query = query.eq('grade_level', parseInt(grade));
    }

    if (gender) {
      query = query.eq('gender', gender);
    }

    const { data, error } = await query.order('last_name').order('first_name');

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json(
        { success: false, message: 'Error fetching students' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      students: data || [],
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('Error fetching students:', error);
    return NextResponse.json(
      { success: false, message: 'Error fetching students' },
      { status: 500 }
    );
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
    const age = parseInt(body.get('age') as string) || 0;
    const gender = body.get('gender') as string;
    const grade_level = parseInt(body.get('grade_level') as string) || 0;
    const section = body.get('section') as string;
    const address = body.get('address') as string;
    const parent_guardian = body.get('parent_guardian') as string;
    const contact_number = body.get('contact_number') as string;

    // Validate required fields
    if (!lrn || !first_name || !birthdate || !gender || !grade_level) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    console.log('[STUDENTS] Creating student with data:', {
      lrn,
      first_name,
      last_name,
      birthdate,
      age,
      gender,
      grade_level,
    });

    const insertData: any = {
      lrn,
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

    // Remove any id field if it exists
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
      console.error('[STUDENTS] Error code:', error.code);
      console.error('[STUDENTS] Error details:', JSON.stringify(error, null, 2));
      
      // Handle specific error cases
      let errorMessage = 'Error creating student';
      
      if (error.code === '23505') {
        // Unique constraint violation (duplicate key)
        if (error.message?.includes('lrn')) {
          errorMessage = 'A student with this LRN already exists. Please use a different LRN.';
        } else if (error.message?.includes('rfid_uid')) {
          errorMessage = 'This RFID card is already registered to another student. Please use a different card.';
        } else {
          // Get max ID to provide helpful error message for sequence issues
          const { data: maxRecord } = await supabase
            .from('students')
            .select('id')
            .order('id', { ascending: false })
            .limit(1)
            .single();
          
          const maxId = maxRecord?.id || 0;
          errorMessage = `Database sequence error. Please run this SQL in Supabase SQL Editor: SELECT setval('students_id_seq', ${maxId + 1}, true);`;
        }
      } else if (error.message?.includes('duplicate key') || error.message?.includes('students_pkey')) {
        const { data: maxRecord } = await supabase
          .from('students')
          .select('id')
          .order('id', { ascending: false })
          .limit(1)
          .single();
        
        const maxId = maxRecord?.id || 0;
        errorMessage = `Database sequence error. Please run this SQL in Supabase SQL Editor: SELECT setval('students_id_seq', ${maxId + 1}, true);`;
      } else if (error.message?.includes('null value') || error.message?.includes('not null')) {
        errorMessage = `Missing required field: ${error.message}`;
      } else if (error.message) {
        errorMessage = `Error creating student: ${error.message}`;
      }
      
      return NextResponse.json(
        { 
          success: false, 
          message: errorMessage,
          error: error.message,
          errorCode: error.code,
        },
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
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('Error creating student:', error);
    return NextResponse.json(
      { success: false, message: 'Error creating student' },
      { status: 500 }
    );
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
    const age = parseInt(body.age) || 0;
    const gender = body.gender;
    const grade_level = parseInt(body.grade_level) || 0;
    const section = body.section;
    const address = body.address;
    const parent_guardian = body.parent_guardian;
    const contact_number = body.contact_number;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Student ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('students')
      .update({
        lrn,
        rfid_uid: rfid_uid || null,
        first_name,
        middle_name,
        last_name,
        birthdate,
        age,
        gender,
        grade_level,
        section,
        address,
        parent_guardian,
        contact_number,
      })
      .eq('id', id);

    if (error) {
      console.error('Supabase update error:', error);
      return NextResponse.json(
        { success: false, message: 'Error updating student' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Student updated successfully',
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('Error updating student:', error);
    return NextResponse.json(
      { success: false, message: 'Error updating student' },
      { status: 500 }
    );
  }
}

// DELETE - Delete student
export async function DELETE(request: NextRequest) {
  try {
    await requireRole('nutritionist', request);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Student ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    const { error } = await supabase.from('students').delete().eq('id', id);

    if (error) {
      console.error('Supabase delete error:', error);
      return NextResponse.json(
        { success: false, message: 'Error deleting student' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Student deleted successfully',
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('Error deleting student:', error);
    return NextResponse.json(
      { success: false, message: 'Error deleting student' },
      { status: 500 }
    );
  }
}
