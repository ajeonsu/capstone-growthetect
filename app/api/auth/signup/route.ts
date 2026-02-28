import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/db';
import * as bcrypt from 'bcryptjs';
import { createToken, setAuthCookie } from '@/lib/auth';
import { isValidEmail, validateRequiredFields } from '@/lib/helpers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.formData();
    const firstName = (body.get('first_name') as string)?.trim() || '';
    const middleName = (body.get('middle_name') as string)?.trim() || '';
    const lastName = (body.get('last_name') as string)?.trim() || '';
    const email = (body.get('email') as string)?.trim() || '';
    const password = body.get('password') as string;
    const confirmPassword = body.get('confirm_password') as string;
    const role = body.get('role') as string;

    // Validation - check for empty strings after trim
    if (!firstName || firstName.trim() === '') {
      return NextResponse.json(
        { success: false, message: 'First name is required' },
        { status: 400 }
      );
    }

    if (!lastName || lastName.trim() === '') {
      return NextResponse.json(
        { success: false, message: 'Last name is required' },
        { status: 400 }
      );
    }

    if (!email || email.trim() === '') {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { success: false, message: 'Password is required' },
        { status: 400 }
      );
    }

    if (!role) {
      return NextResponse.json(
        { success: false, message: 'Role is required' },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email format' },
        { status: 400 }
      );
    }

    if (!email.toLowerCase().endsWith('@gmail.com')) {
      return NextResponse.json(
        { success: false, message: 'Only Gmail addresses (@gmail.com) are allowed' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { success: false, message: 'Passwords do not match' },
        { status: 400 }
      );
    }

    if (!['nutritionist', 'administrator'].includes(role)) {
      return NextResponse.json(
        { success: false, message: 'Invalid role selected' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Enforce role limits: max 2 accounts per role
    const ROLE_LIMIT = 2;
    const { count: roleCount, error: roleCountError } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('role', role);

    if (!roleCountError && roleCount !== null && roleCount >= ROLE_LIMIT) {
      const roleLabel = role === 'administrator' ? 'Administrator' : 'Nutritionist';
      return NextResponse.json(
        { success: false, message: `The maximum limit of ${ROLE_LIMIT} ${roleLabel} accounts has been reached. Please delete an existing account before adding a new one.` },
        { status: 400 }
      );
    }

    // Check if email already exists
    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
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
        { success: false, message: 'Email already registered' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Build full name
    const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ');

    console.log('[SIGNUP] Creating user with data:', {
      first_name: firstName,
      middle_name: middleName,
      last_name: lastName,
      name: fullName,
      email,
      role,
    });

    // Insert user - try both formats to support different table schemas
    const insertData: any = {
      first_name: firstName, // Required by database
      middle_name: middleName || null,
      last_name: lastName, // Required by database
      name: fullName, // Also store full name if table has this column
      email: email,
      password: hashedPassword,
      role: role,
    };

    // Remove any id field if it exists
    delete insertData.id;
    delete insertData.created_at;
    delete insertData.updated_at;

    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([insertData])
      .select('id')
      .single();

    if (insertError) {
      console.error('[SIGNUP] Supabase insert error:', insertError);
      console.error('[SIGNUP] Error code:', insertError.code);
      console.error('[SIGNUP] Error details:', JSON.stringify(insertError, null, 2));
      
      // Handle specific error cases
      let errorMessage = 'An error occurred. Please try again.';
      
      if (insertError.code === '23505') {
        // Unique constraint violation (duplicate key)
        if (insertError.message?.includes('email')) {
          errorMessage = 'This email is already registered. Please use a different email.';
        } else {
          // Get max ID to provide helpful error message for sequence issues
          const { data: maxRecord } = await supabase
            .from('users')
            .select('id')
            .order('id', { ascending: false })
            .limit(1)
            .single();
          
          const maxId = maxRecord?.id || 0;
          errorMessage = `Database sequence error. Please run this SQL in Supabase SQL Editor: SELECT setval('users_id_seq', ${maxId + 1}, true);`;
        }
      } else if (insertError.message?.includes('duplicate key') || insertError.message?.includes('users_pkey')) {
        const { data: maxRecord } = await supabase
          .from('users')
          .select('id')
          .order('id', { ascending: false })
          .limit(1)
          .single();
        
        const maxId = maxRecord?.id || 0;
        errorMessage = `Database sequence error. Please run this SQL in Supabase SQL Editor: SELECT setval('users_id_seq', ${maxId + 1}, true);`;
      } else if (insertError.message?.includes('null value') || insertError.message?.includes('not null')) {
        errorMessage = `Missing required field: ${insertError.message}`;
      } else if (insertError.message) {
        errorMessage = `Error creating account: ${insertError.message}`;
      }
      
      return NextResponse.json(
        { 
          success: false, 
          message: errorMessage,
          error: insertError.message,
          errorCode: insertError.code,
        },
        { status: 500 }
      );
    }

    const userId = newUser.id;

      // Create token
      const token = createToken({
        id: userId,
        name: fullName,
        email,
        role: role as 'nutritionist' | 'administrator',
      });

      const response = NextResponse.json({
        success: true,
        message: 'Account created successfully',
        user: {
          id: userId,
          name: fullName,
          email,
          role,
        },
      });

      setAuthCookie(token, response);
      return response;
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
