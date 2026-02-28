'use client';

import { useEffect, useState } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import { User } from '@/lib/auth';

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
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [formError, setFormError] = useState('');

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
    setSuccessMessage('');
    setErrorMessage('');

    const hasChanges =
      profileData.first_name !== originalValues.first_name ||
      profileData.middle_name !== originalValues.middle_name ||
      profileData.last_name !== originalValues.last_name ||
      profileData.email !== originalValues.email;

    if (!hasChanges) {
      setErrorMessage('Please update some information to proceed');
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
        setSuccessMessage(data.message);
        setOriginalValues(profileData);
        const fullName = [profileData.first_name, profileData.middle_name, profileData.last_name].filter(Boolean).join(' ');
        if (user) {
          setUser({ ...user, name: fullName, email: profileData.email });
        }
        // Dispatch event to update sidebar
        window.dispatchEvent(new Event('profileUpdated'));
      } else {
        setErrorMessage(data.message);
      }
    } catch (error) {
      setErrorMessage('An error occurred. Please try again.');
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
        alert(data.message);
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
        alert('Account deactivated successfully');
        window.location.href = '/login';
      } else {
        alert(data.message);
      }
    } catch (error) {
      alert('An error occurred. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Loading profile...</p>
      </div>
    );
  }

  const fullName = [profileData.first_name, profileData.middle_name, profileData.last_name].filter(Boolean).join(' ');

  return (
    <div className="bg-gray-100 min-h-screen">
      <AdminSidebar />
      <main className="md:ml-64 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-800 mb-8">My Profile</h1>

          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="text-center mb-8 pb-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800">{fullName || 'Administrator'}</h2>
              <p className="text-gray-500 mt-1">Administrator</p>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    id="first_name"
                    value={profileData.first_name}
                    onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label htmlFor="middle_name" className="block text-sm font-medium text-gray-700 mb-2">
                    Middle Name
                  </label>
                  <input
                    type="text"
                    id="middle_name"
                    value={profileData.middle_name}
                    onChange={(e) => setProfileData({ ...profileData, middle_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    id="last_name"
                    value={profileData.last_name}
                    onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div className="pt-6 mt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(true)}
                  className="text-green-600 hover:text-green-700 font-medium text-sm flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  Change Password
                </button>
              </div>

              {successMessage && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                  {successMessage}
                </div>
              )}

              {errorMessage && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {errorMessage}
                </div>
              )}

              <div className="flex justify-end gap-4 pt-8 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setProfileData(originalValues);
                    setSuccessMessage('');
                    setErrorMessage('');
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                  Save Changes
                </button>
              </div>
            </form>
          </div>

          {/* Deactivate Account Section */}
          <div className="bg-white rounded-lg shadow-md p-8 mt-8">
            <button
              type="button"
              onClick={() => {
                setShowDeactivateModal(true);
                setDeactivateStep(1);
              }}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Deactivate Account
            </button>
          </div>
        </div>
      </main>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">Change Password</h3>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  id="currentPassword"
                  name="current_password"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  id="newPassword"
                  name="new_password"
                  required
                  minLength={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirm_password"
                  required
                  minLength={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {formError && <div className="text-red-600 text-sm">{formError}</div>}

              <div className="flex justify-end gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setFormError('');
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
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
    </div>
  );
}
