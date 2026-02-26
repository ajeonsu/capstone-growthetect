import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
  process.env.SUPABASE_ANON_KEY || 
  '';

// #region agent log
if (typeof window === 'undefined') {
  fetch('http://127.0.0.1:7242/ingest/fac9006f-61af-41ca-b3d7-2e8217814211',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:4',message:'Environment variables check',data:{hasUrl:!!supabaseUrl,urlLength:supabaseUrl?.length||0,hasAnonKey:!!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,hasPublishableKey:!!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,anonKeyLength:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length||0,publishableKeyLength:process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?.length||0,resolvedKeyLength:supabaseAnonKey?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'env-check',hypothesisId:'B'})}).catch(()=>{});
}
// #endregion

if (!supabaseUrl || !supabaseAnonKey) {
  const missing = [];
  if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!supabaseAnonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  
  const errorMsg = `Missing required Supabase environment variables: ${missing.join(', ')}. Please create a .env.local file in the next.js_capstone_convertion directory with these variables.`;
  console.error(errorMsg);
  console.error('Available env vars:', {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
  });
  
  // Throw error in server-side context to prevent silent failures
  if (typeof window === 'undefined') {
    throw new Error(errorMsg);
  }
}

// Create Supabase client for server-side usage
export function createServerClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    const availableVars = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
    };
    throw new Error(`Supabase URL and Anon Key are required. Available env vars: ${JSON.stringify(availableVars)}. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY) in your .env.local file.`);
  }
  
  // #region agent log
  if (typeof window === 'undefined') {
    fetch('http://127.0.0.1:7242/ingest/fac9006f-61af-41ca-b3d7-2e8217814211',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:30',message:'Creating Supabase client',data:{urlLength:supabaseUrl?.length||0,keyLength:supabaseAnonKey?.length||0,keyStartsWith:supabaseAnonKey?.substring(0,10)||'empty'},timestamp:Date.now(),sessionId:'debug-session',runId:'supabase-init',hypothesisId:'B'})}).catch(()=>{});
  }
  // #endregion
  
  try {
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
  } catch (error: any) {
    // #region agent log
    if (typeof window === 'undefined') {
      fetch('http://127.0.0.1:7242/ingest/fac9006f-61af-41ca-b3d7-2e8217814211',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:40',message:'Supabase createClient error',data:{error:error?.message,keyFormat:supabaseAnonKey?.substring(0,20)},timestamp:Date.now(),sessionId:'debug-session',runId:'supabase-init',hypothesisId:'B'})}).catch(()=>{});
    }
    // #endregion
    throw error;
  }
}

// Create Supabase client for client-side usage
export function createClientClient() {
  return createClient(supabaseUrl, supabaseAnonKey);
}
