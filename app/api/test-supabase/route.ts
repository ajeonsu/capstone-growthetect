import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/db';

export async function GET() {
  try {
    const supabase = getSupabaseClient();
    
    // Test connection by querying users table with all fields (like login does)
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, password, role')
      .limit(1);

    if (error) {
      return NextResponse.json({
        success: false,
        connected: true,
        tableAccessible: false,
        error: error.message,
        code: error.code,
        hint: error.hint,
        details: error.details,
        commonFix: error.code === '42501' || error.message?.includes('permission') || error.message?.includes('RLS')
          ? 'Row Level Security (RLS) is enabled. You need to create a policy to allow SELECT on the users table, or disable RLS for development.'
          : 'Check if the users table exists and has the required columns: id, name, email, password, role',
      }, { status: 200 });
    }

    return NextResponse.json({
      success: true,
      connected: true,
      tableAccessible: true,
      message: 'Supabase connection successful and users table is accessible',
      sampleData: data && data.length > 0 ? { hasRecords: true, count: data.length } : { hasRecords: false },
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      connected: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 200 });
  }
}
