'use client';

import { useEffect, useState } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import LogoSplash from '@/components/LogoSplash';
import { User } from '@/lib/auth';
import { AlertModal } from '@/components/ui/Modal';

export default function AdminProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    email: '',
  });
  const [originalValues, setOriginalValues] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    email: '',
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivateStep, setDeactivateStep] = useState(1);

  const [formError, setFormError] = useState('');
  const [alertModal, setAlertModal] = useState<{ open: boolean; message: string; type: 'success'|'error'|'warning'|'info'|'delete'; title?: string }>({ open: false, message: '', type: 'info' });
  const showAlert = (message: string, type: 'success'|'error'|'warning'|'info'|'delete' = 'info', title?: string) => setAlertModal({ open: true, message, type, title });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const response = await fetch('/api/auth/me');
      const data = await response.json();

      if (data.success) {
        setUser(data.user);
        // Use individual name fields returned directly from the DB
        const profile = {
          first_name: data.user.first_name || '',
          middle_name: data.user.middle_name || '',
          last_name: data.user.last_name || '',
          email: data.user.email || '',
        };

        setProfileData(profile);
        setOriginalValues(profile);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading user data:', error);
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    const hasChanges =
      profileData.first_name !== originalValues.first_name ||
      profileData.middle_name !== originalValues.middle_name ||
      profileData.last_name !== originalValues.last_name ||
      profileData.email !== originalValues.email;

    if (!hasChanges) {
      showAlert('Please update some information to proceed', 'info', 'No Changes');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('first_name', profileData.first_name);
      formData.append('middle_name', profileData.middle_name);
      formData.append('last_name', profileData.last_name);
      formData.append('email', profileData.email);

      const response = await fetch('/api/profile/update', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        showAlert(data.message, 'success', 'Profile Updated');
        setOriginalValues(profileData);
        const fullName = [profileData.first_name, profileData.middle_name, profileData.last_name].filter(Boolean).join(' ');
        if (user) {
          setUser({ ...user, name: fullName, email: profileData.email });
        }
        window.dispatchEvent(new Event('profileUpdated'));
      } else {
        showAlert(data.message, 'error', 'Update Failed');
      }
    } catch (error) {
      showAlert('An error occurred. Please try again.', 'error', 'Update Failed');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const formData = new FormData(e.target as HTMLFormElement);
    const newPassword = formData.get('new_password') as string;
    const confirmPassword = formData.get('confirm_password') as string;

    if (newPassword !== confirmPassword) {
      setFormError('New password and confirm password do not match');
      return;
    }

    try {
      const response = await fetch('/api/profile/change-password', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        showAlert(data.message, 'success');
        setShowPasswordModal(false);
        (e.target as HTMLFormElement).reset();
      } else {
        setFormError(data.message);
      }
    } catch (error) {
      setFormError('An error occurred. Please try again.');
    }
  };

  const handleDeactivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const formData = new FormData(e.target as HTMLFormElement);
    const password = formData.get('password') as string;

    try {
      const response = await fetch('/api/profile/deactivate', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setDeactivateStep(3);
      } else {
        setFormError(data.message);
      }
    } catch (error) {
      setFormError('An error occurred. Please try again.');
    }
  };

  const confirmDeactivate = async () => {
    try {
      const response = await fetch('/api/profile/deactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      });

      const data = await response.json();

      if (data.success) {
        showAlert('Account deactivated successfully', 'success');
        window.location.href = '/login';
      } else {
        showAlert(data.message, 'error');
      }
    } catch (error) {
      showAlert('An error occurred. Please try again.', 'error');
    }
  };

  if (loading) return <LogoSplash />;

  const fullName = [profileData.first_name, profileData.middle_name, profileData.last_name].filter(Boolean).join(' ');
  const initials = [profileData.first_name, profileData.last_name].filter(Boolean).map(n => n[0].toUpperCase()).join('');

  return (
    <div className="bg-slate-100 min-h-screen">
      <AdminSidebar />
      <main className="md:ml-60 p-4 sm:p-8">
        <div className="max-w-3xl mx-auto">

          {/* Hero / Avatar Card */}
          <div className="relative bg-white rounded-2xl shadow-md overflow-hidden mb-6">
            {/* Banner */}
            <div className="h-28 w-full" style={{ background: 'linear-gradient(135deg, #1a3a6c 0%, #2563eb 100%)' }} />
            {/* Avatar */}
            <div className="absolute top-12 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full ring-4 ring-white bg-blue-700 flex items-center justify-center shadow-lg">
              <span className="text-3xl font-bold text-white">{initials || '?'}</span>
            </div>
            <div className="pt-16 pb-6 text-center px-6">
              <h2 className="text-2xl font-bold text-slate-800">{fullName || 'Administrator'}</h2>
              <span className="inline-block mt-1 px-3 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">Administrator</span>
              <p className="text-sm text-slate-500 mt-2">{profileData.email}</p>
            </div>
          </div>

          {/* Personal Information Card */}
          <div className="bg-white rounded-2xl shadow-md overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-slate-700">Personal Information</h3>
            </div>
            <form onSubmit={handleUpdateProfile} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="first_name" className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">First Name</label>
                  <input
                    type="text"
                    id="first_name"
                    value={profileData.first_name}
                    onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                  />
                </div>
                <div>
                  <label htmlFor="middle_name" className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Middle Name</label>
                  <input
                    type="text"
                    id="middle_name"
                    value={profileData.middle_name}
                    onChange={(e) => setProfileData({ ...profileData, middle_name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                  />
                </div>
                <div>
                  <label htmlFor="last_name" className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Last Name</label>
                  <input
                    type="text"
                    id="last_name"
                    value={profileData.last_name}
                    onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Email</label>
                  <input
                    type="email"
                    id="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button type="submit" className="px-5 py-2.5 text-sm font-semibold bg-blue-700 text-white rounded-xl hover:bg-blue-800 shadow-sm transition">
                  Save Changes
                </button>
              </div>
            </form>
          </div>

          {/* Security Card */}
          <div className="bg-white rounded-2xl shadow-md overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-slate-700">Security</h3>
            </div>
            <div className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-700">Password</p>
                <p className="text-xs text-slate-400 mt-0.5">Change your account password</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                Change Password
              </button>
            </div>
          </div>

          {/* Danger Zone Card */}
          <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-red-100">
            <div className="px-6 py-4 border-b border-red-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-red-700">Danger Zone</h3>
            </div>
            <div className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-700">Deactivate Account</p>
                <p className="text-xs text-slate-400 mt-0.5">Permanently delete your account and all data</p>
              </div>
              <button
                type="button"
                onClick={() => { setShowDeactivateModal(true); setDeactivateStep(1); }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700 shadow-sm transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Deactivate Account
              </button>
            </div>
          </div>

        </div>
      </main>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Change Password</h3>
                <p className="text-xs text-slate-400">Keep your account secure</p>
              </div>
            </div>
            <form onSubmit={handleChangePassword} className="p-6 space-y-4">
              <div>
                <label htmlFor="currentPassword" className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Current Password</label>
                <input type="password" id="currentPassword" name="current_password" required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition" />
              </div>
              <div>
                <label htmlFor="newPassword" className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">New Password</label>
                <input type="password" id="newPassword" name="new_password" required minLength={6}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition" />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Confirm New Password</label>
                <input type="password" id="confirmPassword" name="confirm_password" required minLength={6}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition" />
              </div>
              {formError && <p className="text-red-600 text-sm bg-red-50 border border-red-200 px-3 py-2 rounded-xl">{formError}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowPasswordModal(false); setFormError(''); }}
                  className="px-5 py-2.5 text-sm font-semibold border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 transition">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2.5 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-sm transition">
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deactivate Account Modal */}
      {showDeactivateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
            {deactivateStep === 1 && (
              <div>
                <div className="flex items-center justify-center mb-6">
                  <div className="bg-red-100 rounded-full p-3">
                    <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-red-600 mb-4 text-center">DANGER!</h3>
                <p className="text-gray-700 mb-6 text-center">
                  You may have deactivate this account and will no longer have access to this account. All your data will be permanently deleted.
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => setDeactivateStep(2)}
                    className="w-full px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                  >
                    Proceed
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeactivateModal(false);
                      setDeactivateStep(1);
                    }}
                    className="w-full px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {deactivateStep === 2 && (
              <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-6">Enter Your Password</h3>
                <p className="text-gray-600 mb-4">Please enter your password to continue with account deactivation.</p>
                <form onSubmit={handleDeactivate} className="space-y-4">
                  <div>
                    <label htmlFor="deactivatePassword" className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      id="deactivatePassword"
                      name="password"
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  {formError && <div className="text-red-600 text-sm">{formError}</div>}
                  <div className="flex flex-col gap-3 pt-2">
                    <button type="submit" className="w-full px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
                      Proceed
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDeactivateModal(false);
                        setDeactivateStep(1);
                      }}
                      className="w-full px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {deactivateStep === 3 && (
              <div>
                <div className="flex items-center justify-center mb-6">
                  <div className="bg-red-100 rounded-full p-3">
                    <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4 text-center">Final Confirmation</h3>
                <p className="text-gray-700 mb-6 text-center font-semibold">Are you sure you want to delete this account?</p>
                <p className="text-gray-600 mb-6 text-center text-sm">
                  This action cannot be undone. All your data will be permanently deleted.
                </p>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={confirmDeactivate}
                    className="flex-1 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                  >
                    Yes, Delete My Account
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeactivateModal(false);
                      setDeactivateStep(1);
                    }}
                    className="flex-1 px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                  >
                    No, Keep My Account
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <AlertModal
        isOpen={alertModal.open}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        onClose={() => setAlertModal(prev => ({ ...prev, open: false }))}
      />
    </div>
  );
}
