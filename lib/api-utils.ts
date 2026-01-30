// ============================================
// API UTILITY FUNCTIONS
// ============================================

import { NextResponse } from 'next/server';
import type { ApiResponse, ApiError } from '@/types';

// ============================================
// RESPONSE HELPERS
// ============================================

/**
 * Create a success response
 */
export function createSuccessResponse<T = any>(
  data?: T,
  message?: string,
  status: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      message,
      data,
    },
    { status }
  );
}

/**
 * Create an error response
 */
export function createErrorResponse(
  message: string,
  status: number = 500,
  error?: string
): NextResponse<ApiError> {
  return NextResponse.json(
    {
      success: false,
      message,
      error,
    },
    { status }
  );
}

/**
 * Create a validation error response
 */
export function createValidationErrorResponse(
  errors: string[]
): NextResponse<ApiError> {
  return NextResponse.json(
    {
      success: false,
      message: 'Validation failed',
      error: errors.join(', '),
    },
    { status: 400 }
  );
}

/**
 * Create an unauthorized response
 */
export function createUnauthorizedResponse(
  message: string = 'Unauthorized'
): NextResponse<ApiError> {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    { status: 401 }
  );
}

/**
 * Create a forbidden response
 */
export function createForbiddenResponse(
  message: string = 'Forbidden'
): NextResponse<ApiError> {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    { status: 403 }
  );
}

/**
 * Create a not found response
 */
export function createNotFoundResponse(
  resource: string = 'Resource'
): NextResponse<ApiError> {
  return NextResponse.json(
    {
      success: false,
      message: `${resource} not found`,
    },
    { status: 404 }
  );
}

// ============================================
// REQUEST VALIDATION
// ============================================

/**
 * Validate required fields in form data
 */
export function validateFormData(
  formData: FormData,
  requiredFields: string[]
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  requiredFields.forEach((field) => {
    const value = formData.get(field);
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      errors.push(`${field} is required`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate required fields in JSON data
 */
export function validateJsonData(
  data: any,
  requiredFields: string[]
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  requiredFields.forEach((field) => {
    const value = data[field];
    if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
      errors.push(`${field} is required`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Parse integer from form data
 */
export function parseFormInt(
  formData: FormData,
  field: string,
  defaultValue: number = 0
): number {
  const value = formData.get(field);
  if (!value) return defaultValue;
  const parsed = parseInt(value.toString());
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse float from form data
 */
export function parseFormFloat(
  formData: FormData,
  field: string,
  defaultValue: number = 0
): number {
  const value = formData.get(field);
  if (!value) return defaultValue;
  const parsed = parseFloat(value.toString());
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Get string from form data
 */
export function getFormString(
  formData: FormData,
  field: string,
  defaultValue: string = ''
): string {
  const value = formData.get(field);
  return value ? value.toString().trim() : defaultValue;
}

// ============================================
// ERROR HANDLING
// ============================================

/**
 * Handle Supabase errors
 */
export function handleSupabaseError(error: any): NextResponse<ApiError> {
  console.error('Supabase error:', error);
  
  // Check for specific error types
  if (error.code === '23505') {
    // Unique violation
    return createErrorResponse('A record with this data already exists', 409);
  }
  
  if (error.code === '23503') {
    // Foreign key violation
    return createErrorResponse('Referenced record does not exist', 400);
  }
  
  if (error.code === 'PGRST116') {
    // Row not found
    return createNotFoundResponse();
  }
  
  return createErrorResponse(
    error.message || 'Database error occurred',
    500,
    error.code
  );
}

/**
 * Handle authentication errors
 */
export function handleAuthError(error: any): NextResponse<ApiError> {
  console.error('Auth error:', error);
  
  if (error.message === 'Unauthorized' || error.message === 'Invalid token') {
    return createUnauthorizedResponse();
  }
  
  if (error.message === 'Forbidden') {
    return createForbiddenResponse();
  }
  
  return createErrorResponse('Authentication error occurred', 401);
}

/**
 * Wrap async route handler with error handling
 */
export function withErrorHandling(
  handler: (request: any, ...args: any[]) => Promise<NextResponse>
) {
  return async (request: any, ...args: any[]) => {
    try {
      return await handler(request, ...args);
    } catch (error: any) {
      console.error('API Error:', error);
      
      // Handle specific error types
      if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
        return handleAuthError(error);
      }
      
      // Handle Supabase errors
      if (error.code && error.code.startsWith('PG')) {
        return handleSupabaseError(error);
      }
      
      // Generic error
      return createErrorResponse(
        error.message || 'An unexpected error occurred',
        500
      );
    }
  };
}

// ============================================
// QUERY HELPERS
// ============================================

/**
 * Parse search params safely
 */
export function getSearchParam(
  url: URL,
  param: string,
  defaultValue: string = ''
): string {
  return url.searchParams.get(param) || defaultValue;
}

/**
 * Parse integer search param
 */
export function getSearchParamInt(
  url: URL,
  param: string,
  defaultValue: number = 0
): number {
  const value = url.searchParams.get(param);
  if (!value) return defaultValue;
  const parsed = parseInt(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse boolean search param
 */
export function getSearchParamBool(
  url: URL,
  param: string,
  defaultValue: boolean = false
): boolean {
  const value = url.searchParams.get(param);
  if (!value) return defaultValue;
  return value === 'true' || value === '1';
}

// ============================================
// DATA SANITIZATION
// ============================================

/**
 * Sanitize string input
 */
export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

/**
 * Sanitize object data
 */
export function sanitizeData<T extends Record<string, any>>(data: T): T {
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? sanitizeString(item) : item
      );
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeData(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized as T;
}

// ============================================
// PAGINATION
// ============================================

export interface PaginationParams {
  page: number;
  perPage: number;
  offset: number;
  limit: number;
}

/**
 * Get pagination parameters from search params
 */
export function getPaginationParams(
  url: URL,
  defaultPerPage: number = 50
): PaginationParams {
  const page = Math.max(1, getSearchParamInt(url, 'page', 1));
  const perPage = Math.max(1, Math.min(100, getSearchParamInt(url, 'per_page', defaultPerPage)));
  const offset = (page - 1) * perPage;
  
  return {
    page,
    perPage,
    offset,
    limit: perPage,
  };
}

/**
 * Create paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  perPage: number
): ApiResponse<T[]> & { pagination: any } {
  const totalPages = Math.ceil(total / perPage);
  
  return {
    success: true,
    data,
    pagination: {
      total,
      per_page: perPage,
      current_page: page,
      total_pages: totalPages,
      has_prev: page > 1,
      has_next: page < totalPages,
    },
  };
}

// ============================================
// RATE LIMITING
// ============================================

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

/**
 * Simple in-memory rate limiter
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);
  
  if (!record || now > record.resetTime) {
    // Create new record
    const resetTime = now + windowMs;
    rateLimitMap.set(identifier, { count: 1, resetTime });
    return { allowed: true, remaining: maxRequests - 1, resetTime };
  }
  
  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }
  
  // Increment count
  record.count++;
  return { allowed: true, remaining: maxRequests - record.count, resetTime: record.resetTime };
}

/**
 * Clear rate limit for identifier
 */
export function clearRateLimit(identifier: string): void {
  rateLimitMap.delete(identifier);
}

/**
 * Clear expired rate limit entries
 */
export function cleanupRateLimits(): void {
  const now = Date.now();
  const entries = Array.from(rateLimitMap.entries());
  entries.forEach(([key, record]) => {
    if (now > record.resetTime) {
      rateLimitMap.delete(key);
    }
  });
}

// Cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimits, 5 * 60 * 1000);
}
