import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/db';
import { requireRole } from '@/lib/auth';

// Temporary endpoint to fix the BMI records sequence
// This should only be accessible to administrators
export async function POST(request: NextRequest) {
  try {
    await requireRole('administrator', request);

    const supabase = getSupabaseClient();

    // Get the current max ID
    const { data: maxRecord, error: maxError } = await supabase
      .from('bmi_records')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)
      .single();

    if (maxError && maxError.code !== 'PGRST116') {
      return NextResponse.json(
        { success: false, message: 'Error checking max ID', error: maxError.message },
        { status: 500 }
      );
    }

    const maxId = maxRecord?.id || 0;
    const nextId = maxId + 1;

    // Try to fix the sequence using a SQL function
    // Note: This requires Supabase to allow SQL execution
    const { data, error } = await supabase.rpc('fix_bmi_sequence', {
      new_value: nextId,
    });

    if (error) {
      // If RPC doesn't work, return instructions
      return NextResponse.json({
        success: false,
        message: 'Cannot fix sequence automatically. Please run this SQL in Supabase:',
        sql: `SELECT setval('bmi_records_id_seq', ${nextId}, true);`,
        currentMaxId: maxId,
        nextId: nextId,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Sequence fixed successfully',
      currentMaxId: maxId,
      nextId: nextId,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Error fixing sequence' },
      { status: 500 }
    );
  }
}
