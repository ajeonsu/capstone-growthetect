import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/db';
import * as bcrypt from 'bcryptjs';
import { createToken } from '@/lib/auth';

const SESSION_TIMEOUT = 3600; // 1 hour

export async function POST(request: NextRequest) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/fac9006f-61af-41ca-b3d7-2e8217814211',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'login/route.ts:8',message:'Login request received',data:{hasBody:true},timestamp:Date.now(),sessionId:'debug-session',runId:'login-debug',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  console.log('[LOGIN] Request received');
  try {
    const body = await request.formData();
    const email = body.get('email') as string;
    const password = body.get('password') as string;

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/fac9006f-61af-41ca-b3d7-2e8217814211',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'login/route.ts:15',message:'Form data parsed',data:{email:email?.substring(0,5)+'...',hasPassword:!!password},timestamp:Date.now(),sessionId:'debug-session',runId:'login-debug',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    console.log('[LOGIN] Email:', email);

    if (!email || !password) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/fac9006f-61af-41ca-b3d7-2e8217814211',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'login/route.ts:20',message:'Missing credentials',data:{hasEmail:!!email,hasPassword:!!password},timestamp:Date.now(),sessionId:'debug-session',runId:'login-debug',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      console.log('[LOGIN] Missing email or password');
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      );
    }

    let supabase;
    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/fac9006f-61af-41ca-b3d7-2e8217814211',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'login/route.ts:28',message:'Before Supabase init',data:{hasSupabaseUrl:!!process.env.NEXT_PUBLIC_SUPABASE_URL,hasAnonKey:!!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,hasPublishableKey:!!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,anonKeyLength:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length||0,publishableKeyLength:process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'login-debug',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      console.log('[LOGIN] Initializing Supabase client...');
      supabase = getSupabaseClient();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/fac9006f-61af-41ca-b3d7-2e8217814211',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'login/route.ts:30',message:'Supabase client initialized',data:{clientExists:!!supabase},timestamp:Date.now(),sessionId:'debug-session',runId:'login-debug',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      console.log('[LOGIN] Supabase client initialized');
    } catch (clientError: any) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/fac9006f-61af-41ca-b3d7-2e8217814211',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'login/route.ts:33',message:'Supabase init error',data:{error:clientError?.message,stack:clientError?.stack?.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'login-debug',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      console.error('[LOGIN] Supabase client initialization error:', clientError);
      
      // Provide more specific error message
      let errorMessage = 'Database connection failed. Please check configuration.';
      if (clientError?.message?.includes('supabaseKey') || clientError?.message?.includes('required')) {
        errorMessage = 'Supabase configuration is missing. Please create a .env.local file with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY. See .env.local.example for reference.';
      }
      
      return NextResponse.json(
        { success: false, message: errorMessage, error: clientError?.message },
        { status: 500 }
      );
    }
    
    // Query user from Supabase
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/fac9006f-61af-41ca-b3d7-2e8217814211',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'login/route.ts:42',message:'Before Supabase query',data:{email:email?.substring(0,5)+'...'},timestamp:Date.now(),sessionId:'debug-session',runId:'login-debug',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    console.log('[LOGIN] Querying users table for email:', email);
    const queryStart = Date.now();
    
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, email, password, role')
      .eq('email', email)
      .limit(1);
    
    const queryTime = Date.now() - queryStart;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/fac9006f-61af-41ca-b3d7-2e8217814211',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'login/route.ts:50',message:'After Supabase query',data:{queryTime,usersFound:users?.length||0,hasError:!!error,errorCode:error?.code,errorMessage:error?.message?.substring(0,100)},timestamp:Date.now(),sessionId:'debug-session',runId:'login-debug',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    console.log(`[LOGIN] Query completed in ${queryTime}ms. Users found:`, users?.length || 0);

    if (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/fac9006f-61af-41ca-b3d7-2e8217814211',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'login/route.ts:54',message:'Supabase query error',data:{errorCode:error?.code,errorMessage:error?.message,errorDetails:JSON.stringify(error).substring(0,300)},timestamp:Date.now(),sessionId:'debug-session',runId:'login-debug',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      console.error('[LOGIN] Supabase query error:', error);
      console.error('[LOGIN] Error details:', JSON.stringify(error, null, 2));
      
      // Check for common Supabase errors
      let errorMessage = 'An error occurred. Please try again.';
      
      if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        errorMessage = 'Database table not found. Please ensure the "users" table exists in Supabase.';
      } else if (error.code === '42501' || error.message?.includes('permission denied') || error.message?.includes('RLS')) {
        errorMessage = 'Database access denied. Please check Row Level Security (RLS) policies in Supabase. The "users" table may have RLS enabled.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return NextResponse.json(
        { success: false, message: errorMessage, errorCode: error.code },
        { status: 500 }
      );
    }

    if (!users || users.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const user = users[0];
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/fac9006f-61af-41ca-b3d7-2e8217814211',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'login/route.ts:82',message:'Before password comparison',data:{userId:user?.id,hasPassword:!!user?.password,passwordLength:user?.password?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'login-debug',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    console.log('[LOGIN] User found, comparing password...');

    const isValidPassword = await bcrypt.compare(password, user.password);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/fac9006f-61af-41ca-b3d7-2e8217814211',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'login/route.ts:86',message:'After password comparison',data:{isValidPassword},timestamp:Date.now(),sessionId:'debug-session',runId:'login-debug',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    console.log('[LOGIN] Password valid:', isValidPassword);
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const fullName = user.name || '';

    // Create token
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/fac9006f-61af-41ca-b3d7-2e8217814211',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'login/route.ts:97',message:'Before token creation',data:{userId:user.id,hasJwtSecret:!!process.env.JWT_SECRET},timestamp:Date.now(),sessionId:'debug-session',runId:'login-debug',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    const token = createToken({
      id: user.id,
      name: fullName,
      email: user.email,
      role: user.role,
    });
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/fac9006f-61af-41ca-b3d7-2e8217814211',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'login/route.ts:105',message:'After token creation',data:{tokenLength:token?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'login-debug',hypothesisId:'E'})}).catch(()=>{});
    // #endregion

    // Determine redirect URL based on role
    const redirect =
      user.role === 'nutritionist'
        ? '/nutritionist-overview'
        : '/admin-dashboard';

    // Return JSON response with cookie - let frontend handle redirect
    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      redirect,
      user: {
        id: user.id,
        name: fullName,
        email: user.email,
        role: user.role,
      },
    });

    // Set auth cookie
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_TIMEOUT,
      path: '/',
    });
    
    console.log('[LOGIN] Login successful - returning JSON with cookie and redirect URL');
    return response;
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/fac9006f-61af-41ca-b3d7-2e8217814211',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'login/route.ts:135',message:'Login catch block error',data:{errorMessage:error?.message,errorStack:error?.stack?.substring(0,300),errorName:error?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'login-debug',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    console.error('[LOGIN] Login error:', error);
    console.error('[LOGIN] Error stack:', error.stack);
    return NextResponse.json(
      { success: false, message: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
