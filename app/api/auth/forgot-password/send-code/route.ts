import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { message: 'Email is required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name')
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
      
      const emailSent = await sendResetEmail(email, code, user.full_name);
      
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
    // Check if we're using Resend API (production-ready email service)
    const resendApiKey = process.env.RESEND_API_KEY;
    
    if (resendApiKey) {
      // Use Resend for production email delivery
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'GROWTHetect <noreply@growthetect.com>',
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
        }),
      });

      if (!response.ok) {
        console.error('Resend API error:', await response.text());
        return false;
      }

      return true;
    }

    // Fallback: Log to console for development
    console.log('==========================================');
    console.log('PASSWORD RESET CODE (Development Mode)');
    console.log('==========================================');
    console.log('Email:', email);
    console.log('Code:', code);
    console.log('Expires in: 15 minutes');
    console.log('==========================================');
    
    return true;

  } catch (error) {
    console.error('Send email error:', error);
    return false;
  }
}
