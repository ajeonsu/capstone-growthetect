import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Fetch fresh data from DB — use the `name` column as source of truth
    // (it's updated on every profile save and at login)
    const supabase = getSupabaseClient();
    const { data: dbUser } = await supabase
      .from('users')
      .select('first_name, middle_name, last_name, name, email')
      .eq('id', user.id)
      .single();

    // Derive individual name parts from the combined `name` field so they stay in sync
    const combined: string = dbUser?.name || user.name || '';
    const parts = combined.trim().split(/\s+/).filter(Boolean);
    const derivedFirst = parts[0] || dbUser?.first_name || '';
    const derivedLast = parts.length > 1 ? parts[parts.length - 1] : (dbUser?.last_name || '');
    const derivedMiddle = parts.length > 2 ? parts.slice(1, -1).join(' ') : (dbUser?.middle_name || '');

    return NextResponse.json({
      success: true,
      user: {
        ...user,
        name: combined || user.name,
        first_name: derivedFirst,
        middle_name: derivedMiddle,
        last_name: derivedLast,
        email: dbUser?.email || user.email,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Error fetching user' },
      { status: 500 }
    );
  }
}
