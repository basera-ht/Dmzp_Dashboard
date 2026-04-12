import { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api';

type PaymentProofStatus = 'valid' | 'empty' | 'invalid';

interface FormEntry {
  name?: string;
  email?: string;
  phone?: string;
  institution?: string;
  course?: string;
  fees?: string;
  paymentProofStatus?: PaymentProofStatus;
}

export function MemberActivityTable() {
  const [entries, setEntries] = useState<FormEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEntries() {
      try {
        const response = await apiClient.get<{ entries: FormEntry[] }>('/form-data/entries?limit=10');
        if (response.success && response.data) {
          setEntries(response.data.entries);
        }
      } catch (err) {
        // Silent fail
      } finally {
        setLoading(false);
      }
    }

    fetchEntries();
  }, []);

  const getStatusBadge = (fees?: string, paymentProofStatus?: PaymentProofStatus) => {
    const paid = fees?.toLowerCase() === 'yes';
    if (paid) {
      return (
        <span className="inline-flex px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
          Fees Paid
        </span>
      );
    }
    if (paymentProofStatus === 'invalid') {
      return (
        <span className="inline-flex px-2 py-1 rounded-full text-xs bg-amber-100 text-amber-800">
          Proof invalid
        </span>
      );
    }
    return (
      <span className="inline-flex px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
        Pending
      </span>
    );
  };

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
                WhatsApp
              </th>
              <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                Institution
              </th>
              <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                Course
              </th>
              <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                Fees Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Loading...</td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No recent activity</td>
              </tr>
            ) : (
              entries.map((entry, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {entry.name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                    {entry.phone || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entry.institution || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {entry.course || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(entry.fees, entry.paymentProofStatus)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
