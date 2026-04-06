import { Bell, Lock, User, Globe, Mail, Shield } from 'lucide-react';

export function Settings() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-1">Settings</h1>
        <p className="text-sm text-gray-600">Manage your dashboard preferences and account settings</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
                <User className="w-5 h-5 text-teal-600" />
              </div>
              <h3 className="text-gray-900">Profile Settings</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-2">Full Name</label>
                <input
                  type="text"
                  defaultValue="Admin User"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">Email Address</label>
                <input
                  type="email"
                  defaultValue="admin@impact.org"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">Role</label>
                <input
                  type="text"
                  defaultValue="System Administrator"
                  disabled
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Bell className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-gray-900">Notification Preferences</h3>
            </div>
            <div className="space-y-4">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-sm text-gray-900">Email Notifications</p>
                  <p className="text-xs text-gray-500">Receive updates via email</p>
                </div>
                <input type="checkbox" defaultChecked className="w-4 h-4 text-teal-600 rounded" />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-sm text-gray-900">New Member Alerts</p>
                  <p className="text-xs text-gray-500">Get notified when new members join</p>
                </div>
                <input type="checkbox" defaultChecked className="w-4 h-4 text-teal-600 rounded" />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-sm text-gray-900">Weekly Reports</p>
                  <p className="text-xs text-gray-500">Receive weekly summary emails</p>
                </div>
                <input type="checkbox" className="w-4 h-4 text-teal-600 rounded" />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-sm text-gray-900">Chapter Activity Updates</p>
                  <p className="text-xs text-gray-500">Get notified about chapter events</p>
                </div>
                <input type="checkbox" defaultChecked className="w-4 h-4 text-teal-600 rounded" />
              </label>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                <Lock className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="text-gray-900">Security</h3>
            </div>
            <div className="space-y-4">
              <button className="w-full flex items-center justify-between px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <span className="text-sm text-gray-900">Change Password</span>
                <span className="text-sm text-teal-600">Update</span>
              </button>
              <button className="w-full flex items-center justify-between px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <span className="text-sm text-gray-900">Two-Factor Authentication</span>
                <span className="text-sm text-gray-500">Not enabled</span>
              </button>
              <button className="w-full flex items-center justify-between px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <span className="text-sm text-gray-900">Active Sessions</span>
                <span className="text-sm text-gray-500">2 devices</span>
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                <Globe className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="text-gray-900">Regional Settings</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-2">Language</label>
                <select className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option>English</option>
                  <option>Hindi</option>
                  <option>Tamil</option>
                  <option>Bengali</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">Time Zone</label>
                <select className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option>IST (UTC+5:30)</option>
                  <option>GMT (UTC+0)</option>
                  <option>EST (UTC-5)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">Date Format</label>
                <select className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option>DD/MM/YYYY</option>
                  <option>MM/DD/YYYY</option>
                  <option>YYYY-MM-DD</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                <Mail className="w-5 h-5 text-orange-600" />
              </div>
              <h3 className="text-gray-900">Support</h3>
            </div>
            <div className="space-y-3">
              <a href="#" className="block text-sm text-teal-600 hover:text-teal-700">Help Center</a>
              <a href="#" className="block text-sm text-teal-600 hover:text-teal-700">Contact Support</a>
              <a href="#" className="block text-sm text-teal-600 hover:text-teal-700">Documentation</a>
              <a href="#" className="block text-sm text-teal-600 hover:text-teal-700">Privacy Policy</a>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                <Shield className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-gray-900">Danger Zone</h3>
            </div>
            <button className="w-full px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm">
              Delete Account
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-4">
        <button className="px-6 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          Cancel
        </button>
        <button className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">
          Save Changes
        </button>
      </div>
    </div>
  );
}
