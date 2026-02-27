import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/db';
import * as bcrypt from 'bcryptjs';
import { verifyToken } from '@/lib/auth';

// Helper: ensure caller is an administrator
async function requireAdmin(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;
  try {
    const user = await verifyToken(token);
    if (!user || user.role !== 'administrator') return null;
    return user;
  } catch {
    return null;
  }
}

// GET /api/users — list all users (admin only)
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('users')
    .select('id, first_name, middle_name, last_name, email, role, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, users: data });
}

// PUT /api/users — update a user (admin only)
export async function PUT(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, first_name, middle_name, last_name, email, role, newPassword } = body;

    if (!id || !first_name || !last_name || !email || !role) {
      return NextResponse.json(
        { success: false, message: 'ID, first name, last name, email, and role are required' },
        { status: 400 }
      );
    }

    // Gmail only
    if (!email.toLowerCase().endsWith('@gmail.com')) {
      return NextResponse.json(
        { success: false, message: 'Only Gmail addresses (@gmail.com) are allowed' },
        { status: 400 }
      );
    }

    if (!['nutritionist', 'administrator'].includes(role)) {
      return NextResponse.json({ success: false, message: 'Invalid role' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // Check email uniqueness (excluding current user)
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .neq('id', id)
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({ success: false, message: 'Email already in use by another account' }, { status: 400 });
    }

    const full_name = [first_name, middle_name, last_name].filter(Boolean).join(' ');

    const updateData: any = {
      first_name,
      middle_name: middle_name || null,
      last_name,
      name: full_name,
      email,
      role,
    };

    // Only update password if a new one is provided
    if (newPassword) {
      if (newPassword.length < 6) {
        return NextResponse.json(
          { success: false, message: 'Password must be at least 6 characters' },
          { status: 400 }
        );
      }
      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    const { error } = await supabase.from('users').update(updateData).eq('id', id);

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'User updated successfully' });
  } catch {
    return NextResponse.json({ success: false, message: 'An error occurred' }, { status: 500 });
  }
}

// DELETE /api/users?id=X — delete a user (admin only)
export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ success: false, message: 'User ID is required' }, { status: 400 });
  }

  // Prevent admin from deleting themselves
  if (String(admin.id) === String(id)) {
    return NextResponse.json(
      { success: false, message: 'You cannot delete your own account' },
      { status: 400 }
    );
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase.from('users').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'User deleted successfully' });
}
