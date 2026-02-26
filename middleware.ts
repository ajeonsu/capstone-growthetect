import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/auth';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/forgot-password'];
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
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Verify token for protected routes
  if (!isPublicRoute && token) {
    try {
      const user = await verifyToken(token);
      if (!user) {
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.delete('auth_token');
        return response;
      }

      // Role-based route protection
      if (pathname.startsWith('/admin') && user.role !== 'administrator') {
        return NextResponse.redirect(new URL('/nutritionist-overview', request.url));
      }

      if (pathname.startsWith('/nutritionist') && user.role !== 'nutritionist') {
        return NextResponse.redirect(new URL('/admin-dashboard', request.url));
      }

      // /signup is admin-only
      if (pathname === '/signup' && user.role !== 'administrator') {
        return NextResponse.redirect(new URL('/login', request.url));
      }

      return NextResponse.next();
    } catch {
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
