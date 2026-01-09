import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/db';
import { requireAuth, getCurrentUser } from '@/lib/auth';
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

    // Update user profile
    // Note: Supabase schema might have separate fields or a single 'name' field
    // Adjust based on your actual schema
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        name: fullName,
        email: email,
        // If your schema has separate fields:
        // first_name: firstName,
        // middle_name: middleName,
        // last_name: lastName,
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

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        first_name: firstName,
        middle_name: middleName,
        last_name: lastName,
        email: email,
      },
    });
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
