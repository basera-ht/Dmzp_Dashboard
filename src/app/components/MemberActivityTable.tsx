const members = [
  {
    name: 'Priya Sharma',
    chapter: 'Mumbai Metro',
    joinDate: '2026-03-15',
    memberType: 'Student',
    status: 'Active',
  },
  {
    name: 'Raj Patel',
    chapter: 'Delhi Central',
    joinDate: '2026-03-12',
    memberType: 'Professional',
    status: 'Active',
  },
  {
    name: 'Anita Kumar',
    chapter: 'Bangalore Tech',
    joinDate: '2026-03-10',
    memberType: 'Professional',
    status: 'Active',
  },
  {
    name: 'Vikram Singh',
    chapter: 'Chennai Hub',
    joinDate: '2026-03-08',
    memberType: 'Student',
    status: 'Pending',
  },
  {
    name: 'Meera Reddy',
    chapter: 'Kolkata Guild',
    joinDate: '2026-03-05',
    memberType: 'Professional',
    status: 'Active',
  },
  {
    name: 'Arjun Desai',
    chapter: 'Mumbai Metro',
    joinDate: '2026-03-03',
    memberType: 'Student',
    status: 'Active',
  },
  {
    name: 'Kavya Nair',
    chapter: 'Bangalore Tech',
    joinDate: '2026-03-01',
    memberType: 'Professional',
    status: 'Active',
  },
];

export function MemberActivityTable() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-gray-900">Recent Member Activity</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                Member Name
              </th>
              <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                Chapter
              </th>
              <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                Join Date
              </th>
              <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                Member Type
              </th>
              <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {members.map((member, index) => (
              <tr key={index} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {member.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {member.chapter}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {member.joinDate}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {member.memberType}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex px-2 py-1 rounded-full text-xs ${
                      member.status === 'Active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {member.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
