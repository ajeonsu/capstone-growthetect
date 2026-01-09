import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body.email;

    console.log('[TEST-LOGIN] Testing with email:', email);

    const supabase = getSupabaseClient();
    
    console.log('[TEST-LOGIN] Querying users...');
    const startTime = Date.now();
    
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, email, role')
      .eq('email', email)
      .limit(1);
    
    const endTime = Date.now();
    console.log(`[TEST-LOGIN] Query took ${endTime - startTime}ms`);

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        code: error.code,
        queryTime: endTime - startTime,
      });
    }

    return NextResponse.json({
      success: true,
      userFound: users && users.length > 0,
      userCount: users?.length || 0,
      queryTime: endTime - startTime,
    });
  } catch (error: any) {
    console.error('[TEST-LOGIN] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
    });
  }
}
