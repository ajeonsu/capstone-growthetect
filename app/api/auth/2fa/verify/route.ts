import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { createToken } from '@/lib/auth';

const SESSION_TIMEOUT = 3600; // 1 hour

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json({ message: 'Email and code are required' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Verify code — only match non-expired, unused codes
    const { data: record, error: codeError } = await supabase
      .from('login_2fa_codes')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (codeError || !record) {
      return NextResponse.json({ message: 'Invalid or expired verification code.' }, { status: 400 });
    }

    // Mark code as used and clean up
    await supabase.from('login_2fa_codes').delete().eq('email', email);

    // Fetch user data to build the session token
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, name, email, role')
      .eq('email', email)
      .single();

    if (userError || !user) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    const token = createToken({
      id: user.id,
      name: user.name || '',
      email: user.email,
      role: user.role,
    });

    const redirect = user.role === 'nutritionist' ? '/nutritionist-overview' : '/admin-dashboard';

    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
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
  } catch (error: any) {
    console.error('2FA verify error:', error);
    return NextResponse.json({ message: 'An error occurred.' }, { status: 500 });
  }
}
