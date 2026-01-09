import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Set a test cookie
  const response = NextResponse.json({ 
    message: 'Test cookie set',
    cookies: request.cookies.getAll().map(c => c.name)
  });
  
  response.cookies.set('test_cookie', 'test_value', {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 3600,
    path: '/',
  });
  
  return response;
}
