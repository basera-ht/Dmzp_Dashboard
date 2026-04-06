import { useState, useEffect, useRef } from 'react';
import { FileText, Download, Calendar, TrendingUp, Upload, Eye, Loader2 } from 'lucide-react';
import { apiClient } from '../../lib/api';

interface FormStats {
  totalMembers: number;
  totalFees: number;
  byYear: Record<string, number>;
  byMonth: Record<string, number>;
}

interface Report {
  id: number;
  name: string;
  type: string;
  date: string;
  status: string;
  fileUrl?: string;
}

export function Reports() {
  const [stats, setStats] = useState<FormStats | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, reportsRes] = await Promise.all([
          apiClient.get<FormStats>('/form-data/stats'),
          apiClient.get<{ data: Report[] }>('/reports?limit=50'),
        ]);
        
        if (statsRes.success && statsRes.data) {
          setStats(statsRes.data);
        }
        if (reportsRes.success && reportsRes.data) {
          setReports(reportsRes.data.data || []);
        }
      } catch (err) {
        // Silent fail
      } finally {
        setLoading(false);
      }
    }

    fetchData();
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

  const handleUploadClick = (reportId: number) => {
    fileInputRef.current?.click();
    fileInputRef.current!.dataset.reportId = reportId.toString();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reportId = parseInt(e.target.dataset.reportId || '0');
    if (!reportId) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    if (file.type !== 'application/pdf') {
      alert('Only PDF files are allowed');
      return;
    }

    setUploadingId(reportId);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/reports/${reportId}/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${apiClient.getToken()}`,
        },
      });

      const result = await response.json();
      
      if (result.success) {
        setReports(prev => prev.map(r => 
          r.id === reportId ? { ...r, fileUrl: result.data?.fileUrl } : r
        ));
      } else {
        alert(result.error || 'Upload failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Upload failed');
    } finally {
      setUploadingId(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleView = (url?: string) => {
    if (url) {
      window.open(url, '_blank');
    }
  };

  const handleDownload = (url?: string) => {
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.download = '';
      link.click();
    }
  };

  return (
    <div className="p-8">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        data-report-id="0"
        onChange={handleFileChange}
      />

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
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">PDF</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading...</td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No reports available</td>
                </tr>
              ) : (
                reports.map((report) => (
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {report.date ? new Date(report.date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
                        {report.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {report.fileUrl ? (
                        <span className="text-xs text-green-600 flex items-center gap-1">
                          <FileText className="w-3 h-3" /> Uploaded
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Not uploaded</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {uploadingId === report.id ? (
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Uploading...
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => handleUploadClick(report.id)}
                              className="flex items-center gap-1 px-2 py-1 text-sm text-teal-600 hover:text-teal-700 border border-teal-200 rounded hover:bg-teal-50 transition-colors"
                            >
                              <Upload className="w-3 h-3" />
                              Upload
                            </button>
                            {report.fileUrl && (
                              <>
                                <button
                                  onClick={() => handleView(report.fileUrl)}
                                  className="p-1 text-blue-600 hover:text-blue-700"
                                  title="View"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDownload(report.fileUrl)}
                                  className="p-1 text-teal-600 hover:text-teal-700"
                                  title="Download"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </>
                        )}
                      </div>
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
