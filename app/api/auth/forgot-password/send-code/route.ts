import { NextResponse } from 'next/server';
import { sendPasswordResetCode } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { message: 'Email is required' },
        { status: 400 }
      );
    }

    if (!email.toLowerCase().endsWith('@gmail.com')) {
      return NextResponse.json(
        { message: 'Only Gmail addresses (@gmail.com) are supported for password reset' },
        { status: 400 }
      );
    }

    await sendPasswordResetCode(email);
    // Always return the same message regardless of whether the email exists (security)
    return NextResponse.json(
      { message: 'If an account exists with this email, a verification code has been sent.' },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { message: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}

