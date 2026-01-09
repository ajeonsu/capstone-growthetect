import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SESSION_TIMEOUT = 3600; // 1 hour

// Create a secret key for jose (Edge Runtime compatible)
const getJoseSecret = () => {
  const secret = new TextEncoder().encode(JWT_SECRET);
  return secret;
};

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'nutritionist' | 'administrator';
}

/**
 * Create JWT token for user
 */
export function createToken(user: User): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: SESSION_TIMEOUT }
  );
}

/**
 * Verify JWT token (Edge Runtime compatible - for middleware)
 */
export async function verifyToken(token: string): Promise<User | null> {
  try {
    // Use jose for Edge Runtime compatibility
    const secret = getJoseSecret();
    const { payload } = await jwtVerify(token, secret);
    
    console.log('[AUTH] Token verified successfully for user:', payload.email);
    return {
      id: payload.id as number,
      name: payload.name as string,
      email: payload.email as string,
      role: payload.role as 'nutritionist' | 'administrator',
    };
  } catch (error: any) {
    console.error('[AUTH] Token verification failed:', error.message);
    return null;
  }
}

/**
 * Verify JWT token (synchronous version for Node.js runtime - used in API routes)
 */
export function verifyTokenSync(token: string): User | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    console.log('[AUTH] Token verified successfully for user:', decoded.email);
    return {
      id: decoded.id,
      name: decoded.name,
      email: decoded.email,
      role: decoded.role,
    };
  } catch (error: any) {
    console.error('[AUTH] Token verification failed:', error.message);
    return null;
  }
}

/**
 * Get user from request (server-side)
 * Works for both API routes (with NextRequest) and Server Components (with cookies())
 */
export async function getCurrentUser(request?: NextRequest): Promise<User | null> {
  try {
    let token: string | undefined;
    
    if (request) {
      // API route - get token from request cookies
      token = request.cookies.get('auth_token')?.value;
    } else {
      // Server Component - get token from cookies()
      const cookieStore = await cookies();
      token = cookieStore.get('auth_token')?.value;
    }
    
    if (!token) return null;
    
    // Use sync version for server components (Node.js runtime)
    return verifyTokenSync(token);
  } catch (error) {
    return null;
  }
}

/**
 * Check if user is logged in
 */
export async function isLoggedIn(request?: NextRequest): Promise<boolean> {
  const user = await getCurrentUser(request);
  return user !== null;
}

/**
 * Require authentication (middleware)
 */
export async function requireAuth(request?: NextRequest): Promise<User> {
  const user = await getCurrentUser(request);
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

/**
 * Require specific role
 */
export async function requireRole(
  role: 'nutritionist' | 'administrator',
  request?: NextRequest
): Promise<User> {
  const user = await requireAuth(request);
  if (user.role !== role) {
    throw new Error('Forbidden');
  }
  return user;
}

/**
 * Set auth cookie
 */
export function setAuthCookie(token: string, response: NextResponse) {
  // Set cookie with explicit settings
  response.cookies.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_TIMEOUT,
    path: '/',
  });
  console.log('[AUTH] Cookie set with maxAge:', SESSION_TIMEOUT);
  console.log('[AUTH] Cookie value length:', token.length);
  return response;
}

/**
 * Clear auth cookie
 */
export function clearAuthCookie(response: NextResponse) {
  response.cookies.delete('auth_token');
  return response;
}
