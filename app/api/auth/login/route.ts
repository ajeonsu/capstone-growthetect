import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/db';
import * as bcrypt from 'bcryptjs';
import { sendLogin2FACode } from '@/lib/email';
import { createToken, verifyDeviceToken } from '@/lib/auth';

const SESSION_TIMEOUT = 3600; // 1 hour

export async function POST(request: NextRequest) {
  try {
    const body = await request.formData();
    const email = body.get('email') as string;
    const password = body.get('password') as string;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      );
    }

    let supabase;
    try {
      supabase = getSupabaseClient();
    } catch (clientError: any) {
      console.error('[LOGIN] Supabase client initialization error:', clientError);
      
      let errorMessage = 'Database connection failed. Please check configuration.';
      if (clientError?.message?.includes('supabaseKey') || clientError?.message?.includes('required')) {
        errorMessage = 'Supabase configuration is missing. Please create a .env.local file with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.';
      }
      
      return NextResponse.json(
        { success: false, message: errorMessage, error: clientError?.message },
        { status: 500 }
      );
    }
    
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, email, password, role')
      .eq('email', email)
      .limit(1);

    if (error) {
      console.error('[LOGIN] Supabase query error:', error);
      
      let errorMessage = 'An error occurred. Please try again.';
      if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        errorMessage = 'Database table not found. Please ensure the "users" table exists in Supabase.';
      } else if (error.code === '42501' || error.message?.includes('permission denied') || error.message?.includes('RLS')) {
        errorMessage = 'Database access denied. Please check Row Level Security (RLS) policies in Supabase.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return NextResponse.json(
        { success: false, message: errorMessage, errorCode: error.code },
        { status: 500 }
      );
    }

    if (!users || users.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const user = users[0];
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Credentials valid — check if this device is already trusted
    const trustedDeviceCookie = request.cookies.get('trusted_device')?.value;
    if (trustedDeviceCookie) {
      const trustedEmail = verifyDeviceToken(trustedDeviceCookie);
      if (trustedEmail === user.email) {
        // Trusted device — skip 2FA, issue session token directly
        const token = createToken({
          id: user.id,
          name: user.name || '',
          email: user.email,
          role: user.role,
        });
        const redirect = user.role === 'nutritionist' ? '/nutritionist-overview' : '/admin-dashboard';
        const response = NextResponse.json({
          success: true,
          redirect,
          user: { id: user.id, name: user.name, email: user.email, role: user.role },
        });
        response.cookies.set('auth_token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: SESSION_TIMEOUT,
          path: '/',
        });
        return response;
      }
    }

    // New/untrusted device — trigger 2FA
    const { success: sent, message: sendMsg } = await sendLogin2FACode(user.email);
    if (!sent) {
      return NextResponse.json({ success: false, message: sendMsg }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      requires2FA: true,
      email: user.email,
      message: 'A verification code has been sent to your email.',
    });
  } catch (error: any) {
    console.error('[LOGIN] Login error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
