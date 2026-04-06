import { useState, useEffect } from 'react';
import { Search, Download, UserPlus } from 'lucide-react';
import { apiClient } from '../../lib/api';

interface FormEntry {
  name?: string;
  year?: string;
  email?: string;
  fees?: string;
}

export function AllProfiles() {
  const [entries, setEntries] = useState<FormEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [years, setYears] = useState<string[]>([]);

  useEffect(() => {
    async function fetchEntries() {
      try {
        const response = await apiClient.get<{ entries: FormEntry[] }>('/form-data/entries?limit=100');
        if (response.success && response.data) {
          setEntries(response.data.entries);
          const uniqueYears = [...new Set(response.data.entries.map(e => e.year).filter((y): y is string => !!y))].sort();
          setYears(uniqueYears);
        }
      } catch (err) {
        // Silent fail
      } finally {
        setLoading(false);
      }
    }

    fetchEntries();
  }, []);

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = !searchTerm || 
      entry.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesYear = yearFilter === 'all' || entry.year === yearFilter;
    return matchesSearch && matchesYear;
  });

  const getStatusBadge = (fees?: string) => {
    const paid = fees?.toLowerCase() === 'yes';
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${paid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
        {paid ? 'Fees Paid' : 'Pending'}
      </span>
    );
  };

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
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="all">All Years</option>
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
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
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Year</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Fees Status</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Loading...</td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No members found</td>
                </tr>
              ) : (
                filteredEntries.map((entry, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center mr-3">
                          <span className="text-teal-700">{entry.name?.charAt(0) || '?'}</span>
                        </div>
                        <span className="text-sm text-gray-900">{entry.name || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{entry.email || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.year || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(entry.fees)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button className="text-teal-600 hover:text-teal-700">View</button>
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
