import { NextRequest, NextResponse } from 'next/server';

// This endpoint will help us see what cookies are being sent
export async function GET(request: NextRequest) {
  const allCookies = request.cookies.getAll();
  const authToken = request.cookies.get('auth_token');
  
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    cookies: allCookies.map(c => ({
      name: c.name,
      valueLength: c.value.length,
      valuePreview: c.value.substring(0, 20) + '...',
    })),
    authTokenPresent: !!authToken,
    authTokenLength: authToken?.value.length || 0,
    headers: {
      cookie: request.headers.get('cookie') || 'No cookie header',
    },
  });
}
