import { Search, Filter, Download, UserPlus } from 'lucide-react';

const profiles = [
  { id: 1, name: 'Priya Sharma', email: 'priya.sharma@email.com', chapter: 'Mumbai Metro', role: 'Student', status: 'Active', joinDate: '2025-01-15' },
  { id: 2, name: 'Raj Kumar', email: 'raj.kumar@email.com', chapter: 'Delhi Central', role: 'Professional', status: 'Active', joinDate: '2025-02-03' },
  { id: 3, name: 'Ananya Patel', email: 'ananya.patel@email.com', chapter: 'Bangalore Tech', role: 'Organization', status: 'Active', joinDate: '2024-12-20' },
  { id: 4, name: 'Vikram Singh', email: 'vikram.singh@email.com', chapter: 'Chennai Hub', role: 'Student', status: 'Pending', joinDate: '2025-03-10' },
  { id: 5, name: 'Meera Reddy', email: 'meera.reddy@email.com', chapter: 'Mumbai Metro', role: 'Professional', status: 'Active', joinDate: '2024-11-05' },
  { id: 6, name: 'Arjun Mehta', email: 'arjun.mehta@email.com', chapter: 'Kolkata Guild', role: 'Student', status: 'Active', joinDate: '2025-01-28' },
  { id: 7, name: 'Kavya Nair', email: 'kavya.nair@email.com', chapter: 'Bangalore Tech', role: 'Professional', status: 'Active', joinDate: '2024-10-12' },
  { id: 8, name: 'Rohit Desai', email: 'rohit.desai@email.com', chapter: 'Delhi Central', role: 'Organization', status: 'Active', joinDate: '2024-09-18' },
];

export function AllProfiles() {
  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 mb-1">All Member Profiles</h1>
          <p className="text-sm text-gray-600">Browse and manage all registered members</p>
        </div>
        <button className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors">
          <UserPlus className="w-4 h-4" />
          Add Member
        </button>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, email, or chapter..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Filter className="w-4 h-4" />
            Filter
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Chapter</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Join Date</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {profiles.map((profile) => (
                <tr key={profile.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center mr-3">
                        <span className="text-teal-700">{profile.name.charAt(0)}</span>
                      </div>
                      <span className="text-sm text-gray-900">{profile.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{profile.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{profile.chapter}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                      {profile.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      profile.status === 'Active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {profile.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{profile.joinDate}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button className="text-teal-600 hover:text-teal-700">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
