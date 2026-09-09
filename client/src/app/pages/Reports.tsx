import { useState, useEffect, useRef } from 'react';
import { FileText, Download, Calendar, TrendingUp, Upload, Loader2, Trash2, ExternalLink } from 'lucide-react';
import { apiClient } from '../../lib/api';

interface FormStats {
  totalMembers: number;
  totalFees: number;
  byInstitution: Record<string, number>;
  byBloodGroup: Record<string, number>;
  byCourse: Record<string, number>;
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
  const [stats, setStats]             = useState<FormStats | null>(null);
  const [reports, setReports]         = useState<Report[]>([]);
  const [loading, setLoading]         = useState(true);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [uniqueTypes, setUniqueTypes] = useState<string[]>([]);
  const [newReportName, setNewReportName] = useState('');
  const [newReportType, setNewReportType] = useState('');
  const [generating, setGenerating]   = useState(false);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [deletingId, setDeletingId]   = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    try {
      const [statsRes, reportsRes, typesRes] = await Promise.all([
        apiClient.get<FormStats>('/form-data/stats'),
        apiClient.get<{ data: Report[] }>('/reports?limit=50'),
        apiClient.get<string[]>('/reports/types/unique'),
      ]);
      if (statsRes.success && statsRes.data)     setStats(statsRes.data);
      if (reportsRes.success && reportsRes.data) setReports(reportsRes.data.data || []);
      if (typesRes.success && typesRes.data)     setUniqueTypes(typesRes.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ── Generate ──────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!newReportName.trim()) {
      alert('Please provide a report name');
      return;
    }
    setGenerating(true);
    try {
      const response = await apiClient.post<Report>('/reports', {
        name: newReportName.trim(),
        type: newReportType.trim() || 'General',
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
    } catch {
      alert('An unexpected error occurred');
    } finally {
      setGenerating(false);
    }
  };

  // ── Upload ────────────────────────────────────────────────────────────────
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
        credentials: 'include',
      });
      const result = await response.json();
      if (result.success) {
        setReports(prev => prev.map(r => r.id === reportId ? { ...r, fileUrl: result.data?.fileUrl } : r));
      } else {
        alert(result.error || 'Upload failed');
      }
    } catch {
      alert('Upload failed');
    } finally {
      setUploadingId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Download (opens in new tab as inline PDF) ─────────────────────────────
  const handleOpen = async (report: Report) => {
    setDownloading(report.id);
    try {
      const res = await fetch(`${API_BASE}/reports/${report.id}/download`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed');
      const blob = await res.blob();
      // Force inline/view by using a blob URL in a new tab
      const blobUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      window.open(blobUrl, '_blank');
      // Revoke after a short delay to allow tab to load
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
    } catch {
      alert('Could not open PDF. Try downloading instead.');
    } finally {
      setDownloading(null);
    }
  };

  // ── Download (save file) ──────────────────────────────────────────────────
  const handleDownload = async (report: Report) => {
    setDownloading(report.id);
    try {
      const res = await fetch(`${API_BASE}/reports/${report.id}/download`, {
        credentials: 'include',
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

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      const response = await apiClient.delete(`/reports/${id}`);
      if (response.success) {
        setReports(prev => prev.filter(r => r.id !== id));
        setDeleteConfirmId(null);
      } else {
        alert('Failed to delete report');
      }
    } catch {
      alert('Failed to delete report');
    } finally {
      setDeletingId(null);
    }
  };

  // ── Derived stats ─────────────────────────────────────────────────────────
  const totalMembers = stats?.totalMembers ?? 0;
  const totalFees    = stats?.totalFees ?? 0;


  const statValues = [
    { label: 'Total Members',    value: loading ? '...' : totalMembers.toString(), icon: FileText,  color: 'teal'   },
    { label: 'Fees Collected',   value: loading ? '...' : totalFees.toString(),    icon: Calendar,  color: 'blue'   },
    { label: 'Paid Percentage',  value: loading ? '...' : totalMembers > 0 ? `${Math.round((totalFees/totalMembers)*100)}%` : '0%', icon: TrendingUp, color: 'purple' },
    { label: 'Pending Dues',     value: loading ? '...' : (totalMembers - totalFees).toString(), icon: TrendingUp, color: 'green'  },
  ];

  const colorClasses: Record<string, string> = {
    teal:   'bg-teal-50 text-teal-600',
    blue:   'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    green:  'bg-green-50 text-green-600',
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        data-report-id="0"
        onChange={handleFileChange}
      />

      {/* ── Delete Confirm Modal ──────────────────────────────────────────── */}
      {deleteConfirmId !== null && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="text-gray-900 font-semibold">Delete Report?</h3>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              This will permanently remove the report record. Any uploaded PDF remains in storage.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={deletingId === deleteConfirmId}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm transition-colors disabled:opacity-50"
              >
                {deletingId === deleteConfirmId
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</>
                  : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="text-gray-900 mb-1">Reports &amp; Analytics</h1>
        <p className="text-sm text-gray-600">Generate and download detailed reports</p>
      </div>

      {/* ── Stat Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
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

      {/* ── Distributions ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        {/* Course Distribution */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-teal-600" />
            Course Distribution
          </h3>
          <div className="space-y-3">
            {stats && Object.entries(stats.byCourse || {}).length > 0 ? (
              Object.entries(stats.byCourse)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([course, count]) => (
                  <div key={course} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 truncate mr-4">{course}</span>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-teal-500 rounded-full" 
                          style={{ width: `${(count / totalMembers) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-900">{count}</span>
                    </div>
                  </div>
                ))
            ) : (
              <p className="text-sm text-gray-400">No course data available</p>
            )}
          </div>
        </div>

        {/* Institution Distribution */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Top Institutions
          </h3>
          <div className="space-y-3">
            {stats && Object.entries(stats.byInstitution || {}).length > 0 ? (
              Object.entries(stats.byInstitution)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([inst, count]) => (
                  <div key={inst} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 truncate mr-4">{inst}</span>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full" 
                          style={{ width: `${(count / totalMembers) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-900">{count}</span>
                    </div>
                  </div>
                ))
            ) : (
              <p className="text-sm text-gray-400">No institution data available</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Generate New Report ──────────────────────────────────────────── */}
      <datalist id="report-types">
        {uniqueTypes.map(type => <option key={type} value={type} />)}
      </datalist>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
        <h3 className="text-gray-900 mb-4">Generate New Report</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Report Name"
            value={newReportName}
            onChange={e => setNewReportName(e.target.value)}
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

      {/* ── Reports Table ─────────────────────────────────────────────────── */}
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
                    {/* Name */}
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <FileText className="w-5 h-5 text-gray-400 mr-3 shrink-0" />
                        <span className="text-sm text-gray-900">{report.name}</span>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">{report.type}</span>
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {report.date ? new Date(report.date).toLocaleDateString() : 'N/A'}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">{report.status}</span>
                    </td>

                    {/* PDF indicator */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {report.fileUrl ? (
                        <span className="text-xs text-green-600 flex items-center gap-1">
                          <FileText className="w-3 h-3" /> PDF Ready
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">No file</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {uploadingId === report.id ? (
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
                          </div>
                        ) : (
                          <>
                            {/* Upload */}
                            <button
                              onClick={() => handleUploadClick(report.id)}
                              className="flex items-center gap-1 px-2 py-1 text-xs text-teal-600 hover:text-teal-700 border border-teal-200 rounded hover:bg-teal-50 transition-colors"
                            >
                              <Upload className="w-3 h-3" /> Upload
                            </button>

                            {report.fileUrl && (
                              <>
                                {/* Open PDF in new tab (blob URL avoids CORS iframe issues) */}
                                <button
                                  onClick={() => handleOpen(report)}
                                  disabled={downloading === report.id}
                                  className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-700 border border-blue-200 rounded hover:bg-blue-50 transition-colors disabled:opacity-50"
                                  title="Open PDF in new tab"
                                >
                                  {downloading === report.id
                                    ? <Loader2 className="w-3 h-3 animate-spin" />
                                    : <ExternalLink className="w-3 h-3" />}
                                  {downloading === report.id ? 'Opening...' : 'View'}
                                </button>

                                {/* Download */}
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

                            {/* Delete */}
                            <button
                              onClick={() => setDeleteConfirmId(report.id)}
                              className="flex items-center gap-1 px-2 py-1 text-xs text-red-500 hover:text-red-700 border border-red-200 rounded hover:bg-red-50 transition-colors"
                              title="Delete report"
                            >
                              <Trash2 className="w-3 h-3" /> Delete
                            </button>
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
