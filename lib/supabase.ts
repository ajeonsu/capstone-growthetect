import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
  process.env.SUPABASE_ANON_KEY || 
  '';

if (!supabaseUrl || !supabaseAnonKey) {
  const missing = [];
  if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!supabaseAnonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  
  const errorMsg = `Missing required Supabase environment variables: ${missing.join(', ')}. Please create a .env.local file with these variables.`;
  console.error(errorMsg);
  
  // Throw error in server-side context to prevent silent failures
  if (typeof window === 'undefined') {
    throw new Error(errorMsg);
  }
}

// Create Supabase client for server-side usage
export function createServerClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(`Supabase URL and Anon Key are required. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.`);
  }
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
    // Disable Next.js 14 fetch caching for all Supabase queries so data is
    // always fresh (otherwise even dynamic routes can serve stale results).
    global: {
      fetch: (url: RequestInfo | URL, init?: RequestInit) =>
        fetch(url, { ...init, cache: 'no-store' }),
    },
  });
}

// Create Supabase client for client-side usage
export function createClientClient() {
  return createClient(supabaseUrl, supabaseAnonKey);
}
