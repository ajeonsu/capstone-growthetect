import { NextResponse } from 'next/server';
import { sendLogin2FACode } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email) return NextResponse.json({ message: 'Email is required' }, { status: 400 });

    const result = await sendLogin2FACode(email);
    if (!result.success) return NextResponse.json({ message: result.message }, { status: 500 });

    return NextResponse.json({ success: true, message: result.message });
  } catch (error: any) {
    console.error('2FA send error:', error);
    return NextResponse.json({ message: 'An error occurred.' }, { status: 500 });
  }
}
