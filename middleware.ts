import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/auth';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  const { pathname } = request.nextUrl;

  // ALWAYS log in development - this is critical for debugging
  console.log(`\n========== [MIDDLEWARE] ${pathname} ==========`);
  console.log(`[MIDDLEWARE] Token present: ${!!token}`);
  if (token) {
    console.log(`[MIDDLEWARE] Token length: ${token.length}`);
    console.log(`[MIDDLEWARE] Token preview: ${token.substring(0, 20)}...`);
  }
  // Log all cookies for debugging
  const allCookies = request.cookies.getAll();
  console.log(`[MIDDLEWARE] All cookies:`, allCookies.map(c => `${c.name}=${c.value.substring(0, 10)}...`));
  console.log(`[MIDDLEWARE] Cookie count: ${allCookies.length}`);
  console.log(`==========================================\n`);

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/signup'];
  const isPublicRoute = publicRoutes.includes(pathname);

  // If accessing a public route and already logged in, redirect to dashboard
  if (isPublicRoute && token) {
    try {
      const user = await verifyToken(token);
      if (user) {
        if (user.role === 'nutritionist') {
          return NextResponse.redirect(new URL('/nutritionist-overview', request.url));
        } else if (user.role === 'administrator') {
          return NextResponse.redirect(new URL('/admin-dashboard', request.url));
        }
      }
    } catch (error) {
      // Invalid token, clear cookie and allow access to public route
      const response = NextResponse.next();
      response.cookies.delete('auth_token');
      return response;
    }
  }

  // Protected routes - if no token, redirect to login
  if (!isPublicRoute && !token) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[MIDDLEWARE] No token found for ${pathname}, redirecting to login`);
      const allCookies = request.cookies.getAll();
      console.log(`[MIDDLEWARE] Available cookies:`, allCookies.map(c => `${c.name}=${c.value.substring(0, 10)}...`));
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Verify token for protected routes
  if (!isPublicRoute && token) {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[MIDDLEWARE] Verifying token for ${pathname}`);
        console.log(`[MIDDLEWARE] Token value (first 20 chars): ${token.substring(0, 20)}...`);
      }
      const user = await verifyToken(token);
      if (!user) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[MIDDLEWARE] Token verification failed for ${pathname} - token is invalid or expired`);
          console.log(`[MIDDLEWARE] JWT_SECRET is set: ${!!process.env.JWT_SECRET}`);
        }
        // Invalid token, clear cookie and redirect to login
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.delete('auth_token');
        return response;
      }

      if (process.env.NODE_ENV === 'development') {
        console.log(`[MIDDLEWARE] Token valid, user role: ${user.role}`);
      }

      // Role-based route protection
      if (pathname.startsWith('/admin') && user.role !== 'administrator') {
        return NextResponse.redirect(new URL('/nutritionist-overview', request.url));
      }

      if (pathname.startsWith('/nutritionist') && user.role !== 'nutritionist') {
        return NextResponse.redirect(new URL('/admin-dashboard', request.url));
      }

      // Token is valid, allow access
      if (process.env.NODE_ENV === 'development') {
        console.log(`[MIDDLEWARE] Allowing access to ${pathname}`);
      }
      return NextResponse.next();
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`[MIDDLEWARE] Token verification error for ${pathname}:`, error.message);
      }
      // Token verification failed, clear cookie and redirect to login
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('auth_token');
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
