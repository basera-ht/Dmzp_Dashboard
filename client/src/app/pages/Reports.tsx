import { useState, useEffect } from 'react';
import { FileText, Download, Calendar, TrendingUp } from 'lucide-react';
import { apiClient } from '../../lib/api';

interface FormStats {
  totalMembers: number;
  totalFees: number;
  byYear: Record<string, number>;
  byMonth: Record<string, number>;
}

export function Reports() {
  const [stats, setStats] = useState<FormStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await apiClient.get<FormStats>('/form-data/stats');
        if (response.success && response.data) {
          setStats(response.data);
        }
      } catch (err) {
        // Silent fail
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  const totalMembers = stats?.totalMembers ?? 0;
  const totalFees = stats?.totalFees ?? 0;
  const byYear = stats?.byYear ?? {};
  const avgPerYear = totalMembers > 0 ? Math.round(totalMembers / Math.max(Object.keys(byYear).length, 1)) : 0;

  const statValues = [
    { label: 'Total Members', value: loading ? '...' : totalMembers.toString(), icon: FileText, color: 'teal' },
    { label: 'Fees Collected', value: loading ? '...' : totalFees.toString(), icon: Calendar, color: 'blue' },
    { label: 'Average per Year', value: loading ? '...' : avgPerYear.toString(), icon: TrendingUp, color: 'purple' },
    { label: 'Growth Rate', value: loading ? '...' : '+12%', icon: TrendingUp, color: 'green' },
  ];

  const yearEntries = Object.entries(byYear).map(([year, count]) => ({
    year,
    count,
    type: 'Growth Analysis',
    date: new Date().toISOString().split('T')[0],
    status: 'Ready',
  }));

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-1">Reports & Analytics</h1>
        <p className="text-sm text-gray-600">Generate and download detailed reports</p>
      </div>

      <div className="grid grid-cols-4 gap-6 mb-8">
        {statValues.map((stat) => {
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
              {yearEntries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    {loading ? 'Loading...' : 'No reports available'}
                  </td>
                </tr>
              ) : (
                yearEntries.map((report, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <FileText className="w-5 h-5 text-gray-400 mr-3" />
                        <span className="text-sm text-gray-900">{report.year} Member Report</span>
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
