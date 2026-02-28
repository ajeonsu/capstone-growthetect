import nodemailer from 'nodemailer';
import { createServerClient } from '@/lib/supabase';

function createTransporter() {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailPass) {
    throw new Error('Gmail credentials not configured (GMAIL_USER / GMAIL_APP_PASSWORD)');
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: gmailUser, pass: gmailPass },
  });
}

/**
 * Send a 2FA login verification code to the given email.
 * Stores the code in `login_2fa_codes` table and emails it.
 */
export async function sendLogin2FACode(email: string): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = createServerClient();

    const { data: user } = await supabase
      .from('users')
      .select('name')
      .eq('email', email)
      .single();

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any old codes for this user first
    await supabase.from('login_2fa_codes').delete().eq('email', email);

    const { error: insertError } = await supabase.from('login_2fa_codes').insert({
      email,
      code,
      expires_at: expiresAt.toISOString(),
      used: false,
    });

    if (insertError) {
      console.error('Error storing 2FA code:', insertError);
      return { success: false, message: 'Failed to generate verification code.' };
    }

    const transporter = createTransporter();
    const gmailUser = process.env.GMAIL_USER!;

    await transporter.sendMail({
      from: `GROWTHetect <${gmailUser}>`,
      to: email,
      subject: 'GROWTHetect - Login Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">GROWTHetect Login Verification</h2>
          <p>Hi ${user?.name || 'there'},</p>
          <p>A login attempt was made to your account. Use the verification code below to complete your login:</p>
          <div style="background-color: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #10b981; font-size: 42px; letter-spacing: 8px; margin: 0;">${code}</h1>
          </div>
          <p>This code expires in <strong>10 minutes</strong>.</p>
          <p>If you did not attempt to log in, please change your password immediately.</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px;">GROWTHetect - Your Smart Partner in Student Growth Monitoring</p>
        </div>
      `,
    });

    return { success: true, message: 'Verification code sent to your email.' };
  } catch (error: any) {
    console.error('sendLogin2FACode error:', error);
    return { success: false, message: error.message || 'Failed to send verification code.' };
  }
}

/**
 * Send a password reset verification code to the given email.
 * Stores the code in `password_reset_codes` table and emails it.
 */
export async function sendPasswordResetCode(email: string): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = createServerClient();

    const { data: user } = await supabase
      .from('users')
      .select('name')
      .eq('email', email)
      .single();

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Delete any previous codes for this email to avoid stale matches
    await supabase.from('password_reset_codes').delete().eq('email', email);

    const { error: insertError } = await supabase.from('password_reset_codes').insert({
      email,
      code,
      expires_at: expiresAt.toISOString(),
      used: false,
    });

    if (insertError) {
      console.error('Error storing reset code:', insertError);
      return { success: false, message: 'Failed to generate reset code.' };
    }

    const transporter = createTransporter();
    const gmailUser = process.env.GMAIL_USER!;

    await transporter.sendMail({
      from: `GROWTHetect <${gmailUser}>`,
      to: email,
      subject: 'GROWTHetect - Password Reset Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">GROWTHetect Password Reset</h2>
          <p>Hi ${user?.name || 'there'},</p>
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

    return { success: true, message: 'Verification code sent to your email.' };
  } catch (error: any) {
    console.error('sendPasswordResetCode error:', error);
    return { success: false, message: error.message || 'Failed to send verification code.' };
  }
}
