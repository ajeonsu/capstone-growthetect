import { createServerClient } from './supabase';

// Get Supabase client instance
export function getSupabaseClient() {
  return createServerClient();
}

// Legacy function name for backward compatibility
// Note: Supabase doesn't use connection pooling like MySQL
export async function getDBConnection() {
  return getSupabaseClient();
}

// Execute query helper (for Supabase, this is a wrapper)
// Note: Supabase uses a different query syntax, so this is mainly for compatibility
export async function query(table: string, options?: any) {
  try {
    const supabase = getSupabaseClient();
    // This is a simplified wrapper - actual usage should use Supabase query builder directly
    return await supabase.from(table).select('*');
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
}

// Close pool (for cleanup) - Not needed for Supabase but kept for compatibility
export async function closePool() {
  // Supabase handles connections automatically, no cleanup needed
  return Promise.resolve();
}

export default getSupabaseClient;
