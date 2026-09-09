import { useEffect, useState } from 'react';
import { Bell, Lock, User, Database, CheckCircle, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../lib/api';

export function Settings() {
  const { user } = useAuth();

  // ── Change Password state ──────────────────────────────────────────
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMessage, setPwMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [notifEmail, setNotifEmail] = useState(true);
  const [notifNewMember, setNotifNewMember] = useState(true);
  const [notifReports, setNotifReports] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiClient.get<any>('/users/settings/me').then(response => {
      if (!active) return;
      if (response.success && response.data) {
        setNotifEmail(Boolean(response.data.emailNotifications));
        setNotifNewMember(Boolean(response.data.newMemberAlerts));
        setNotifReports(Boolean(response.data.weeklyReports));
      }
    }).catch(() => active && setSettingsError('Unable to load notification settings.')).finally(() => active && setSettingsLoading(false));
    return () => { active = false; };
  }, []);

  const updateSettings = async (next: { emailNotifications?: boolean; newMemberAlerts?: boolean; weeklyReports?: boolean }) => {
    setSettingsError(null);
    try {
      const response = await apiClient.put('/users/settings/me', next);
      if (!response.success) throw new Error(response.error || 'Unable to save settings');
    } catch {
      setSettingsError('Unable to save notification settings. Your change was not saved.');
      // Reload authoritative state rather than leaving an unsaved UI value.
      const response = await apiClient.get<any>('/users/settings/me');
      if (response.success && response.data) {
        setNotifEmail(Boolean(response.data.emailNotifications)); setNotifNewMember(Boolean(response.data.newMemberAlerts)); setNotifReports(Boolean(response.data.weeklyReports));
      }
    }
  };

  const handleChangePassword = async () => {
    setPwMessage(null);

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPwMessage({ type: 'error', text: 'Please fill in all password fields.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (newPassword.length < 8) {
      setPwMessage({ type: 'error', text: 'New password must be at least 8 characters.' });
      return;
    }

    setPwLoading(true);
    try {
      const response = await apiClient.post('/auth/change-password', { oldPassword, newPassword });
      if (response.success) {
        setPwMessage({ type: 'success', text: 'Password changed successfully.' });
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPwMessage({ type: 'error', text: (response.error as string) || 'Failed to change password.' });
      }
    } catch {
      setPwMessage({ type: 'error', text: 'An unexpected error occurred.' });
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-1">Settings</h1>
        <p className="text-sm text-gray-600">Manage your account and dashboard preferences</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ── Left column ──────────────────────────────────────────────── */}
        <div className="xl:col-span-2 space-y-6">

          {/* Profile (read-only, from auth) */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
                <User className="w-5 h-5 text-teal-600" />
              </div>
              <h3 className="text-gray-900">Account Profile</h3>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-teal-500 flex items-center justify-center shrink-0">
                <span className="text-white text-xl font-semibold">
                  {user?.name?.charAt(0).toUpperCase() ?? 'A'}
                </span>
              </div>
              <div>
                <p className="text-gray-900 font-medium">{user?.name ?? '—'}</p>
                <p className="text-sm text-gray-500">{user?.email ?? '—'}</p>
                <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-teal-100 text-teal-700 capitalize">
                  {user?.role ?? 'admin'}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {settingsError && <p className="text-sm text-red-600">{settingsError}</p>}
              <div>
                <label className="block text-sm text-gray-600 mb-2">Full Name</label>
                <input
                  type="text"
                  value={user?.name ?? ''}
                  readOnly
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">Email Address</label>
                <input
                  type="email"
                  value={user?.email ?? ''}
                  readOnly
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">Role</label>
                <input
                  type="text"
                  value={user?.role ?? 'Administrator'}
                  readOnly
                  disabled
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 capitalize"
                />
              </div>
            </div>
          </div>

          {/* Change Password */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                <Lock className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="text-gray-900">Change Password</h3>
            </div>

            {pwMessage && (
              <div
                className={`flex items-center gap-2 px-4 py-3 rounded-lg mb-4 text-sm ${
                  pwMessage.type === 'success'
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {pwMessage.type === 'success'
                  ? <CheckCircle className="w-4 h-4 shrink-0" />
                  : <AlertCircle className="w-4 h-4 shrink-0" />}
                {pwMessage.text}
              </div>
            )}

            <div className="space-y-4">
              {/* Current password */}
              <div>
                <label className="block text-sm text-gray-600 mb-2">Current Password</label>
                <div className="relative">
                  <input
                    type={showOld ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={e => setOldPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full px-4 py-2 pr-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOld(v => !v)}
                    className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New password */}
              <div>
                <label className="block text-sm text-gray-600 mb-2">New Password</label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="w-full px-4 py-2 pr-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(v => !v)}
                    className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-sm text-gray-600 mb-2">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full px-4 py-2 pr-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                onClick={handleChangePassword}
                disabled={pwLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
              >
                {pwLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</> : 'Update Password'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Right column ─────────────────────────────────────────────── */}
        <div className="space-y-6">

          {/* Notification Preferences */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Bell className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-gray-900">Notifications</h3>
            </div>
            <div className="space-y-4">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-sm text-gray-900">Email Notifications</p>
                  <p className="text-xs text-gray-500">Receive updates via email</p>
                </div>
                <input
                  type="checkbox"
                  checked={notifEmail}
                  disabled={settingsLoading}
                  onChange={e => { setNotifEmail(e.target.checked); void updateSettings({ emailNotifications: e.target.checked }); }}
                  className="w-4 h-4 accent-teal-600 rounded"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-sm text-gray-900">New Member Alerts</p>
                  <p className="text-xs text-gray-500">Get notified when new members join</p>
                </div>
                <input
                  type="checkbox"
                  checked={notifNewMember}
                  disabled={settingsLoading}
                  onChange={e => { setNotifNewMember(e.target.checked); void updateSettings({ newMemberAlerts: e.target.checked }); }}
                  className="w-4 h-4 accent-teal-600 rounded"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-sm text-gray-900">Report Generation</p>
                  <p className="text-xs text-gray-500">Notify when reports are ready</p>
                </div>
                <input
                  type="checkbox"
                  checked={notifReports}
                  disabled={settingsLoading}
                  onChange={e => { setNotifReports(e.target.checked); void updateSettings({ weeklyReports: e.target.checked }); }}
                  className="w-4 h-4 accent-teal-600 rounded"
                />
              </label>
            </div>
          </div>

          {/* Data Source */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                <Database className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="text-gray-900">Data Source</h3>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">Member Data</p>
                <p className="text-sm text-gray-700 font-medium">Google Sheets (CSV)</p>
                <p className="text-xs text-gray-400 mt-0.5">Auto-refreshed every 5 minutes</p>
              </div>
              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs text-gray-500 mb-1">Storage</p>
                <p className="text-sm text-gray-700 font-medium">AWS S3 (ap-south-1)</p>
                <p className="text-xs text-gray-400 mt-0.5">Reports &amp; uploaded PDFs</p>
              </div>
              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs text-gray-500 mb-1">Database</p>
                <p className="text-sm text-gray-700 font-medium">PostgreSQL</p>
                <p className="text-xs text-gray-400 mt-0.5">Reports, events, users</p>
              </div>
            </div>
          </div>

          {/* App Info */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-gray-900 mb-4">About</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Application</span>
                <span className="text-gray-900 font-medium">DMZP Dashboard</span>
              </div>
              <div className="flex justify-between">
                <span>Version</span>
                <span className="text-gray-900 font-medium">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span>Environment</span>
                <span className="text-gray-900 font-medium capitalize">
                  {import.meta.env.VITE_APP_ENV ?? 'development'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
