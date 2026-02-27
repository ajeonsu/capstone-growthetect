import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import nodemailer from 'nodemailer';

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

    const supabase = createServerClient();

    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('email', email)
      .single();

    if (userError || !user) {
      // Don't reveal if user exists or not for security
      return NextResponse.json(
        { message: 'If an account exists with this email, a verification code has been sent.' },
        { status: 200 }
      );
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Delete any previous codes for this email to avoid stale matches
    await supabase.from('password_reset_codes').delete().eq('email', email);

    // Store reset code in database
    const { error: insertError } = await supabase
      .from('password_reset_codes')
      .insert({
        email: email,
        code: code,
        expires_at: expiresAt.toISOString(),
        used: false,
      });

    if (insertError) {
      console.error('Error storing reset code:', insertError);
      return NextResponse.json(
        { message: 'Failed to generate reset code' },
        { status: 500 }
      );
    }

    // Send email using production-ready service
    try {
      // Option 1: Use Supabase Edge Function or external email service
      // Option 2: Use environment-configured email service
      
      const emailSent = await sendResetEmail(email, code, user.name);
      
      if (!emailSent) {
        console.error('Failed to send email');
        // Still return success to avoid revealing user existence
      }
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      // Continue anyway
    }

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

async function sendResetEmail(email: string, code: string, fullName: string): Promise<boolean> {
  try {
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailPass) {
      console.error('Gmail credentials not configured (GMAIL_USER / GMAIL_APP_PASSWORD)');
      return false;
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });

    await transporter.sendMail({
      from: `GROWTHetect <${gmailUser}>`,
      to: email,
      subject: 'GROWTHetect - Password Reset Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">GROWTHetect Password Reset</h2>
          <p>Hi ${fullName},</p>
          <p>You requested to reset your password. Use the verification code below:</p>
          <div style="background-color: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #10b981; font-size: 32px; letter-spacing: 5px; margin: 0;">${code}</h1>
          </div>
          <p>This code will expire in 15 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px;">GROWTHetect - Your Smart Partner in Student Growth Monitoring</p>
        </div>
      `,
    });

    return true;
  } catch (error) {
    console.error('Send email error:', error);
    return false;
  }
}
