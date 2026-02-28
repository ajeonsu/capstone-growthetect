import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/db';
import { requireAuth, getCurrentUser, createToken } from '@/lib/auth';
import { isValidEmail } from '@/lib/helpers';

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request);
    const user = await getCurrentUser(request);
    if (!user) throw new Error('Unauthorized');

    const body = await request.formData();
    const firstName = (body.get('first_name') as string)?.trim() || '';
    const middleName = (body.get('middle_name') as string)?.trim() || '';
    const lastName = (body.get('last_name') as string)?.trim() || '';
    const email = (body.get('email') as string)?.trim() || '';

    // Validate required fields
    if (!firstName) {
      return NextResponse.json(
        { success: false, message: 'First name is required' },
        { status: 400 }
      );
    }

    if (!lastName) {
      return NextResponse.json(
        { success: false, message: 'Last name is required' },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email format' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Check if email is already taken by another user
    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .neq('id', user.id)
      .limit(1);

    if (checkError) {
      console.error('Supabase query error:', checkError);
      return NextResponse.json(
        { success: false, message: 'An error occurred. Please try again.' },
        { status: 500 }
      );
    }

    if (existingUsers && existingUsers.length > 0) {
      return NextResponse.json(
        { success: false, message: 'Email is already in use by another user' },
        { status: 400 }
      );
    }

    // Build full name
    const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ');

    // Update user profile — write both the combined name and separate fields
    // so that both /api/auth/me (name field) and /api/users (first/middle/last fields) stay in sync
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        name: fullName,
        first_name: firstName,
        middle_name: middleName || null,
        last_name: lastName,
        email: email,
      })
      .eq('id', user.id)
      .select('id, name, email')
      .single();

    if (updateError) {
      console.error('Supabase update error:', updateError);
      return NextResponse.json(
        { success: false, message: 'Failed to update profile' },
        { status: 500 }
      );
    }

    // Generate new JWT token with updated user information
    const newToken = createToken({
      id: user.id,
      name: fullName,
      email: email,
      role: user.role,
    });

    // Create response and set the new auth token
    const response = NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        first_name: firstName,
        middle_name: middleName,
        last_name: lastName,
        email: email,
      },
    });

    // Set the new token as a cookie
    response.cookies.set('auth_token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600, // 1 hour
      path: '/',
    });

    return response;
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred' },
      { status: 500 }
    );
  }
}
