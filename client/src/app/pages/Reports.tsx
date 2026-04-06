import { FileText, Download, Calendar, TrendingUp } from 'lucide-react';

const reports = [
  { id: 1, name: 'Monthly Member Growth Report', type: 'Growth Analysis', date: '2026-03-31', status: 'Ready' },
  { id: 2, name: 'Chapter Activity Summary', type: 'Activity Report', date: '2026-03-31', status: 'Ready' },
  { id: 3, name: 'Regional Performance Analysis', type: 'Performance', date: '2026-02-28', status: 'Ready' },
  { id: 4, name: 'Q1 2026 Impact Assessment', type: 'Quarterly Report', date: '2026-03-31', status: 'Ready' },
  { id: 5, name: 'Member Demographics Breakdown', type: 'Demographics', date: '2026-03-31', status: 'Ready' },
  { id: 6, name: 'Event Participation Trends', type: 'Engagement', date: '2026-03-15', status: 'Ready' },
];

const quickStats = [
  { label: 'Total Reports', value: '24', icon: FileText, color: 'teal' },
  { label: 'This Month', value: '6', icon: Calendar, color: 'blue' },
  { label: 'Avg Downloads', value: '45', icon: Download, color: 'purple' },
  { label: 'Growth Rate', value: '+12%', icon: TrendingUp, color: 'green' },
];

export function Reports() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-1">Reports & Analytics</h1>
        <p className="text-sm text-gray-600">Generate and download detailed reports</p>
      </div>

      <div className="grid grid-cols-4 gap-6 mb-8">
        {quickStats.map((stat) => {
          const Icon = stat.icon;
          const colorClasses = {
            teal: 'bg-teal-50 text-teal-600',
            blue: 'bg-blue-50 text-blue-600',
            purple: 'bg-purple-50 text-purple-600',
            green: 'bg-green-50 text-green-600',
          };
          return (
            <div key={stat.label} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg ${colorClasses[stat.color as keyof typeof colorClasses]} flex items-center justify-center`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              <p className="text-2xl text-gray-900 mb-1">{stat.value}</p>
              <p className="text-sm text-gray-600">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
        <h3 className="text-gray-900 mb-4">Generate New Report</h3>
        <div className="grid grid-cols-3 gap-4">
          <select className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500">
            <option>Select Report Type</option>
            <option>Growth Analysis</option>
            <option>Activity Report</option>
            <option>Performance</option>
            <option>Demographics</option>
          </select>
          <select className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500">
            <option>Select Date Range</option>
            <option>Last 7 Days</option>
            <option>Last 30 Days</option>
            <option>Last Quarter</option>
            <option>Custom Range</option>
          </select>
          <button className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 transition-colors">
            Generate Report
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-gray-900">Available Reports</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Report Name</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <FileText className="w-5 h-5 text-gray-400 mr-3" />
                      <span className="text-sm text-gray-900">{report.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                      {report.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{report.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
                      {report.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button className="flex items-center gap-2 text-teal-600 hover:text-teal-700 text-sm">
                      <Download className="w-4 h-4" />
                      Download
                    </button>
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
