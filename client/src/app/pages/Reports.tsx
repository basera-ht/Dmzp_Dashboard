import { useState, useEffect, useRef } from 'react';
import { FileText, Download, Calendar, TrendingUp, Upload, Eye, Loader2, X } from 'lucide-react';
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

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export function Reports() {
  const [stats, setStats] = useState<FormStats | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [uniqueTypes, setUniqueTypes] = useState<string[]>([]);
  const [newReportName, setNewReportName] = useState('');
  const [newReportType, setNewReportType] = useState('');
  const [generating, setGenerating] = useState(false);
  const [previewReport, setPreviewReport] = useState<Report | null>(null);
  const [downloading, setDownloading] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, reportsRes, typesRes] = await Promise.all([
          apiClient.get<FormStats>('/form-data/stats'),
          apiClient.get<{ data: Report[] }>('/reports?limit=50'),
          apiClient.get<string[]>('/reports/types/unique'),
        ]);

        if (statsRes.success && statsRes.data) setStats(statsRes.data);
        if (reportsRes.success && reportsRes.data) setReports(reportsRes.data.data || []);
        if (typesRes.success && typesRes.data) setUniqueTypes(typesRes.data);
      } catch (err) {
        // Silent fail
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleGenerate = async () => {
    if (!newReportName.trim() || !newReportType.trim()) {
      alert('Please provide a report name and type');
      return;
    }
    setGenerating(true);
    try {
      const response = await apiClient.post<Report>('/reports', {
        name: newReportName.trim(),
        type: newReportType.trim(),
      });
      if (response.success && response.data) {
        setReports([response.data, ...reports]);
        setNewReportName('');
        setNewReportType('');
        if (!uniqueTypes.includes(response.data.type)) {
          setUniqueTypes([...uniqueTypes, response.data.type]);
        }
      } else {
        alert('Failed to generate report');
      }
    } catch (err) {
      console.error(err);
      alert('An unexpected error occurred');
    } finally {
      setGenerating(false);
    }
  };

  const totalMembers = stats?.totalMembers ?? 0;
  const totalFees = stats?.totalFees ?? 0;
  const byYear = stats?.byYear ?? {};
  const avgPerYear = totalMembers > 0
    ? Math.round(totalMembers / Math.max(Object.keys(byYear).length, 1))
    : 0;

  const statValues = [
    { label: 'Total Members', value: loading ? '...' : totalMembers.toString(), icon: FileText, color: 'teal' },
    { label: 'Fees Collected', value: loading ? '...' : totalFees.toString(), icon: Calendar, color: 'blue' },
    { label: 'Average per Year', value: loading ? '...' : avgPerYear.toString(), icon: TrendingUp, color: 'purple' },
    { label: 'Growth Rate', value: loading ? '...' : '+12%', icon: TrendingUp, color: 'green' },
  ];

  const handleUploadClick = (reportId: number) => {
    if (fileInputRef.current) {
      fileInputRef.current.dataset.reportId = reportId.toString();
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reportId = parseInt(e.target.dataset.reportId || '0');
    if (!reportId) return;

    if (file.size > 10 * 1024 * 1024) { alert('File size must be less than 10MB'); return; }
    if (file.type !== 'application/pdf') { alert('Only PDF files are allowed'); return; }

    setUploadingId(reportId);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE}/reports/${reportId}/upload`, {
        method: 'POST',
        body: formData,
        headers: { 'Authorization': `Bearer ${apiClient.getToken()}` },
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
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleView = (report: Report) => {
    setPreviewReport(report);
  };

  const handleDownload = async (report: Report) => {
    setDownloading(report.id);
    try {
      const res = await fetch(`${API_BASE}/reports/${report.id}/download`, {
        headers: { 'Authorization': `Bearer ${apiClient.getToken()}` },
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${report.name}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      alert('Download failed. Please try again.');
    } finally {
      setDownloading(null);
    }
  };

  const colorClasses: Record<string, string> = {
    teal: 'bg-teal-50 text-teal-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    green: 'bg-green-50 text-green-600',
  };

  return (
    <div className="p-8">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        data-report-id="0"
        onChange={handleFileChange}
      />

      {/* ── PDF Preview Modal ─────────────────────────────────────────── */}
      {previewReport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setPreviewReport(null)}
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            style={{ width: '90vw', maxWidth: '960px', height: '90vh' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-teal-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{previewReport.name}</p>
                  <p className="text-xs text-gray-500">
                    {previewReport.type} &middot; {previewReport.date ? new Date(previewReport.date).toLocaleDateString() : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-4">
                <button
                  onClick={() => handleDownload(previewReport)}
                  disabled={downloading === previewReport.id}
                  className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                >
                  {downloading === previewReport.id
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Downloading...</>
                    : <><Download className="w-4 h-4" /> Download</>}
                </button>
                <button
                  onClick={() => setPreviewReport(null)}
                  className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* PDF iframe */}
            <div className="flex-1 bg-gray-100">
              <iframe
                src={`${previewReport.fileUrl}#toolbar=1&navpanes=0&scrollbar=1`}
                className="w-full h-full border-0"
                title={previewReport.name}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="text-gray-900 mb-1">Reports &amp; Analytics</h1>
        <p className="text-sm text-gray-600">Generate and download detailed reports</p>
      </div>

      {/* ── Stat Cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        {statValues.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg ${colorClasses[stat.color]} flex items-center justify-center`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              <p className="text-2xl text-gray-900 mb-1">{stat.value}</p>
              <p className="text-sm text-gray-600">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* ── Generate New Report ──────────────────────────────────────── */}
      <datalist id="report-types">
        {uniqueTypes.map(type => <option key={type} value={type} />)}
      </datalist>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
        <h3 className="text-gray-900 mb-4">Generate New Report</h3>
        <div className="grid grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Report Name"
            value={newReportName}
            onChange={e => setNewReportName(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <input
            type="text"
            list="report-types"
            placeholder="Select or Type Report Type"
            value={newReportType}
            onChange={e => setNewReportType(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : 'Generate Report'}
          </button>
        </div>
      </div>

      {/* ── Reports Table ────────────────────────────────────────────── */}
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
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2" />Loading...
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No reports available</td>
                </tr>
              ) : (
                reports.map(report => (
                  <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <FileText className="w-5 h-5 text-gray-400 mr-3 shrink-0" />
                        <span className="text-sm text-gray-900">{report.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">{report.type}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {report.date ? new Date(report.date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">{report.status}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {report.fileUrl ? (
                        <span className="text-xs text-green-600 flex items-center gap-1">
                          <FileText className="w-3 h-3" /> PDF Ready
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">No file</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {uploadingId === report.id ? (
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => handleUploadClick(report.id)}
                              className="flex items-center gap-1 px-2 py-1 text-xs text-teal-600 hover:text-teal-700 border border-teal-200 rounded hover:bg-teal-50 transition-colors"
                            >
                              <Upload className="w-3 h-3" /> Upload
                            </button>
                            {report.fileUrl && (
                              <>
                                <button
                                  onClick={() => handleView(report)}
                                  className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-700 border border-blue-200 rounded hover:bg-blue-50 transition-colors"
                                  title="Preview PDF"
                                >
                                  <Eye className="w-3 h-3" /> View
                                </button>
                                <button
                                  onClick={() => handleDownload(report)}
                                  disabled={downloading === report.id}
                                  className="flex items-center gap-1 px-2 py-1 text-xs text-teal-600 hover:text-teal-700 border border-teal-200 rounded hover:bg-teal-50 transition-colors disabled:opacity-50"
                                  title="Download PDF"
                                >
                                  {downloading === report.id
                                    ? <><Loader2 className="w-3 h-3 animate-spin" /> Saving...</>
                                    : <><Download className="w-3 h-3" /> Download</>}
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
