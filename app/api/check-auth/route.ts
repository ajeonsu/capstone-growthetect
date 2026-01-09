import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenSync } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  
  if (!token) {
    return NextResponse.json({
      authenticated: false,
      message: 'No token found',
    });
  }

  try {
    const user = verifyTokenSync(token);
    if (user) {
      return NextResponse.json({
        authenticated: true,
        user,
      });
    } else {
      return NextResponse.json({
        authenticated: false,
        message: 'Invalid token',
      });
    }
  } catch (error: any) {
    return NextResponse.json({
      authenticated: false,
      message: 'Token verification failed',
      error: error.message,
    });
  }
}
