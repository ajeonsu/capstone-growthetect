'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/AdminSidebar';

interface User {
  id: number;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  email: string;
  role: string;
  created_at: string;
}

interface FormState {
  first_name: string;
  middle_name: string;
  last_name: string;
  email: string;
  role: string;
  password: string;
  confirm_password: string;
}

const emptyForm: FormState = {
  first_name: '',
  middle_name: '',
  last_name: '',
  email: '',
  role: '',
  password: '',
  confirm_password: '',
};

export default function ManageUsersPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Search / filter
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Admin guard
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (!data.success || !data.user) router.replace('/login');
        else if (data.user.role !== 'administrator') router.replace('/nutritionist-overview');
        else setAuthChecked(true);
      })
      .catch(() => router.replace('/login'));
  }, [router]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users', { credentials: 'include' });
      const data = await res.json();
      if (data.success) setUsers(data.users);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authChecked) loadUsers();
  }, [authChecked]);

  // Filtered list
  const filtered = users.filter(u => {
    const full = `${u.first_name} ${u.middle_name || ''} ${u.last_name} ${u.email}`.toLowerCase();
    const matchSearch = !search || full.includes(search.toLowerCase());
    const matchRole = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  // Open create modal
  const openCreate = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setFormError('');
    setSuccessMsg('');
    setShowModal(true);
  };

  // Open edit modal
  const openEdit = (u: User) => {
    setEditingUser(u);
    setForm({
      first_name: u.first_name,
      middle_name: u.middle_name || '',
      last_name: u.last_name,
      email: u.email,
      role: u.role,
      password: '',
      confirm_password: '',
    });
    setFormError('');
    setSuccessMsg('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setForm(emptyForm);
    setFormError('');
  };

  // Gmail validation
  const isGmail = (email: string) => email.toLowerCase().endsWith('@gmail.com');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSuccessMsg('');

    if (!isGmail(form.email)) {
      setFormError('Only Gmail addresses (@gmail.com) are allowed.');
      return;
    }

    if (!editingUser) {
      // Creating new user
      if (form.password !== form.confirm_password) { setFormError('Passwords do not match.'); return; }
      if (form.password.length < 6) { setFormError('Password must be at least 6 characters.'); return; }
    } else {
      // Editing — password is optional but must match if provided
      if (form.password && form.password !== form.confirm_password) { setFormError('Passwords do not match.'); return; }
      if (form.password && form.password.length < 6) { setFormError('Password must be at least 6 characters.'); return; }
    }

    setFormLoading(true);
    try {
      if (!editingUser) {
        // Create via existing signup API
        const fd = new FormData();
        fd.append('first_name', form.first_name);
        fd.append('middle_name', form.middle_name);
        fd.append('last_name', form.last_name);
        fd.append('email', form.email);
        fd.append('password', form.password);
        fd.append('confirm_password', form.confirm_password);
        fd.append('role', form.role);

        const res = await fetch('/api/auth/signup', { method: 'POST', credentials: 'include', body: fd });
        const data = await res.json();
        if (!data.success) { setFormError(data.message || 'Failed to create account.'); return; }
        setSuccessMsg('User created successfully!');
      } else {
        // Update via users API
        const res = await fetch('/api/users', {
          method: 'PUT', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingUser.id,
            first_name: form.first_name,
            middle_name: form.middle_name,
            last_name: form.last_name,
            email: form.email,
            role: form.role,
            newPassword: form.password || undefined,
          }),
        });
        const data = await res.json();
        if (!data.success) { setFormError(data.message || 'Failed to update user.'); return; }
        setSuccessMsg('User updated successfully!');
      }

      await loadUsers();
      setTimeout(() => { closeModal(); setSuccessMsg(''); }, 1200);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/users?id=${deleteTarget.id}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json();
      if (!data.success) { alert(data.message); return; }
      setDeleteTarget(null);
      await loadUsers();
    } finally {
      setDeleteLoading(false);
    }
  };

  const roleBadge = (role: string) => {
    if (role === 'administrator') return 'bg-blue-100 text-blue-700';
    if (role === 'nutritionist') return 'bg-green-100 text-green-700';
    return 'bg-slate-100 text-slate-600';
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f1f5f9' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-800 mx-auto mb-4"></div>
          <p className="text-slate-500 text-sm">Verifying access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <AdminSidebar />
      <main className="page-main p-5">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-deped-navy">Manage Users</h1>
            <p className="text-sm text-slate-500 mt-0.5">Create, edit, and remove system accounts</p>
          </div>
          <button onClick={openCreate} className="btn-primary inline-flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add User
          </button>
        </div>

        {/* Filters */}
        <div className="card p-4 mb-5 flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-field-text pl-9 w-full"
            />
          </div>
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="input-field-select w-full sm:w-44"
          >
            <option value="">All Roles</option>
            <option value="administrator">Administrator</option>
            <option value="nutritionist">Nutritionist</option>
          </select>
        </div>

        {/* User Table */}
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header-primary">
                <th className="px-4 py-3 text-left font-semibold">Name</th>
                <th className="px-4 py-3 text-left font-semibold">Email</th>
                <th className="px-4 py-3 text-left font-semibold">Role</th>
                <th className="px-4 py-3 text-left font-semibold">Created</th>
                <th className="px-4 py-3 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-800"></div>
                      Loading users...
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                    No users found.
                  </td>
                </tr>
              ) : (
                filtered.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ background: '#1a3a6c' }}>
                          {(u.first_name[0] + u.last_name[0]).toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-800">
                          {[u.first_name, u.middle_name, u.last_name].filter(Boolean).join(' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${roleBadge(u.role)}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {new Date(u.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEdit(u)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 transition"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteTarget(u)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-700 transition"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Footer count */}
          {!loading && filtered.length > 0 && (
            <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-500">
              Showing {filtered.length} of {users.length} user{users.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* ── Create / Edit Modal ─────────────────────────────────── */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="card p-6 w-full max-w-lg">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-deped-navy">
                  {editingUser ? 'Edit User' : 'Add New User'}
                </h2>
                <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 transition">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">

                {/* ── Name row ── */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'First Name', key: 'first_name', required: true, placeholder: 'First' },
                    { label: 'Middle Name', key: 'middle_name', required: false, placeholder: 'Middle (opt.)' },
                    { label: 'Last Name', key: 'last_name', required: true, placeholder: 'Last' },
                  ].map(({ label, key, required, placeholder }) => (
                    <div key={key}>
                      <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
                      </label>
                      <input
                        type="text"
                        required={required}
                        value={(form as any)[key]}
                        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                        placeholder={placeholder}
                        className="input-field-text w-full"
                      />
                    </div>
                  ))}
                </div>

                {/* ── Gmail ── */}
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                    Gmail Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email" required value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="example@gmail.com"
                      className={`input-field-text w-full pr-10 ${
                        form.email && !form.email.toLowerCase().endsWith('@gmail.com')
                          ? '!border-red-400 focus:!border-red-500'
                          : form.email ? '!border-green-500' : ''
                      }`}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      {form.email && (
                        form.email.toLowerCase().endsWith('@gmail.com')
                          ? <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                          : <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                      )}
                    </div>
                  </div>
                  <p className={`text-xs mt-1.5 ${form.email && !form.email.toLowerCase().endsWith('@gmail.com') ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
                    {form.email && !form.email.toLowerCase().endsWith('@gmail.com')
                      ? '⚠ Must end with @gmail.com — required for Forgot Password to work.'
                      : 'Only @gmail.com addresses are accepted.'}
                  </p>
                </div>

                {/* ── Role ── */}
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    required value={form.role}
                    onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                    className="input-field-select w-full"
                  >
                    <option value="">— Select a role —</option>
                    <option value="nutritionist">Nutritionist</option>
                    <option value="administrator">Administrator</option>
                  </select>
                </div>

                {/* ── Password ── */}
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {editingUser ? 'Change Password (leave blank to keep current)' : 'Set Password'}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                        Password {!editingUser && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="password" value={form.password}
                        onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                        required={!editingUser} minLength={editingUser ? undefined : 6}
                        placeholder="Min. 6 characters"
                        className="input-field-text w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                        Confirm Password {!editingUser && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="password" value={form.confirm_password}
                        onChange={e => setForm(f => ({ ...f, confirm_password: e.target.value }))}
                        required={!editingUser}
                        placeholder="Re-enter password"
                        className="input-field-text w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* ── Feedback ── */}
                {formError && (
                  <div className="flex items-start gap-2.5 bg-red-50 border border-red-300 text-red-700 text-sm px-4 py-3 rounded-lg">
                    <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                    {formError}
                  </div>
                )}
                {successMsg && (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-300 text-green-700 text-sm px-4 py-3 rounded-lg">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    {successMsg}
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
                  <button type="submit" disabled={formLoading} className="btn-primary flex-1">
                    {formLoading ? (editingUser ? 'Saving...' : 'Creating...') : (editingUser ? 'Save Changes' : 'Create Account')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Delete Confirmation Modal ────────────────────────────── */}
        {deleteTarget && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="card p-0 w-full max-w-sm overflow-hidden">
              <div className="p-5 text-white" style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold">Delete User</h3>
                </div>
              </div>
              <div className="p-5">
                <p className="text-slate-600 text-sm mb-1">
                  Are you sure you want to delete:
                </p>
                <p className="font-semibold text-deped-navy mb-1">
                  {[deleteTarget.first_name, deleteTarget.middle_name, deleteTarget.last_name].filter(Boolean).join(' ')}
                </p>
                <p className="text-slate-500 text-xs mb-4">{deleteTarget.email}</p>
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-5">
                  This action cannot be undone. The user will lose all access immediately.
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setDeleteTarget(null)} className="btn-secondary flex-1">Cancel</button>
                  <button onClick={handleDelete} disabled={deleteLoading} className="btn-danger flex-1">
                    {deleteLoading ? 'Deleting...' : 'Delete User'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
