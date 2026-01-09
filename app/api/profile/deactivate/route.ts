import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/db';
import { requireAuth, getCurrentUser } from '@/lib/auth';
import * as bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request);
    const user = await getCurrentUser(request);
    if (!user) throw new Error('Unauthorized');

    // Handle both FormData and JSON
    let password: string | null = null;
    let confirmValue: string | boolean | null = null;

    const contentType = request.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const body = await request.json();
      password = body.password || null;
      confirmValue = body.confirm || null;
    } else {
      const body = await request.formData();
      password = body.get('password') as string | null;
      confirmValue = body.get('confirm') as string | null;
    }

    // If confirm is true, proceed with deactivation
    if (confirmValue === 'true' || confirmValue === true) {
      const supabase = getSupabaseClient();

      // Delete the user account (as per original PHP implementation)
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id);

      if (error) {
        console.error('Supabase delete error:', error);
        return NextResponse.json(
          { success: false, message: 'Failed to deactivate account' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Account deactivated successfully',
      });
    }

    // Otherwise, verify password first
    if (!password) {
      return NextResponse.json(
        { success: false, message: 'Password is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Get current password hash
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('password')
      .eq('id', user.id)
      .single();

    if (fetchError || !userData) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, userData.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, message: 'Password is incorrect' },
        { status: 400 }
      );
    }

    // Password verified, return success to proceed to final confirmation
    return NextResponse.json({
      success: true,
      message: 'Password verified',
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('Error in deactivate account:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred' },
      { status: 500 }
    );
  }
}
