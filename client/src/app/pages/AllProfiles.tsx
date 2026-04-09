import { useState, useEffect } from 'react';
import { Search, Download, UserPlus, X, Mail, RefreshCw, CheckCircle2, Trash2, Loader2 } from 'lucide-react';
import { apiClient } from '../../lib/api';

interface FormEntry {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  institution?: string;
  course?: string;
  address?: string;
  bloodGroup?: string;
  fees?: string;
}

export function AllProfiles() {
  const [entries, setEntries] = useState<FormEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Add Member Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newMember, setNewMember] = useState({
    name: '',
    email: '',
    phone: '',
    institution: '',
    course: '',
    address: '',
    bloodGroup: '',
    fees: 'no'
  });

  // View Member Modal State
  const [selectedMember, setSelectedMember] = useState<FormEntry | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Card send state
  const [sendingCardFor, setSendingCardFor] = useState<string | null>(null);
  const [cardSentFor, setCardSentFor] = useState<string | null>(null);
  const [cardError, setCardError] = useState<string | null>(null);

  // Deletion State
  const [memberToDelete, setMemberToDelete] = useState<FormEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function fetchEntries() {
      try {
        const response = await apiClient.get<{ entries: FormEntry[] }>('/form-data/entries?limit=100');
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

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = !searchTerm || 
      entry.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.phone?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getStatusBadge = (fees?: string) => {
    const paid = fees?.toLowerCase() === 'yes';
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${paid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
        {paid ? 'Fees Paid' : 'Pending'}
      </span>
    );
  };

  const handleExport = () => {
    const headers = ['Name', 'Email', 'Phone', 'Institution', 'Course', 'Fees Status'];
    const rows = filteredEntries.map(entry => [
      `"${entry.name || 'N/A'}"`,
      `"${entry.email || 'N/A'}"`,
      `"${entry.phone || 'N/A'}"`,
      `"${entry.institution || 'N/A'}"`,
      `"${entry.course || 'N/A'}"`,
      `"${entry.fees === 'yes' ? 'Fees Paid' : 'Pending'}"`
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'members_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.post('/members', {
        name: newMember.name,
        email: newMember.email,
        phone: newMember.phone,
        institution: newMember.institution,
        course: newMember.course,
        address: newMember.address,
        bloodGroup: newMember.bloodGroup,
        fees: newMember.fees,
        memberType: 'Student',
      });

      // Auto-send membership card
      if (newMember.email) {
        await apiClient.post('/member-card/send', {
          name: newMember.name,
          email: newMember.email,
          fees: newMember.fees,
        });
      }

      setEntries([newMember, ...entries]);
      setNewMember({ name: '', email: '', phone: '', institution: '', course: '', address: '', bloodGroup: '', fees: 'no' });
      setIsAddModalOpen(false);
    } catch (err) {
      console.error('Failed to add member', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendCard = async (entry: FormEntry) => {
    if (!entry.email) return;
    const key = entry.email;
    setSendingCardFor(key);
    setCardError(null);
    setCardSentFor(null);
    try {
      const res = await apiClient.post('/member-card/send', {
        name: entry.name,
        email: entry.email,
        fees: entry.fees,
        id: entry.id,
        bloodGroup: entry.bloodGroup,
        address: entry.address,
        phone: entry.phone
      });
      if (res.success) {
        setCardSentFor(key);
        setTimeout(() => setCardSentFor(null), 3000);
      } else {
        setCardError((res.error as string) || 'Failed to send card');
      }
    } catch {
      setCardError('Network error — could not send card');
    } finally {
      setSendingCardFor(null);
    }
  };

  const handleDeleteMember = async () => {
    if (!memberToDelete) return;
    setIsDeleting(true);
    try {
      const res = memberToDelete.id
        ? await apiClient.delete(`/members/${memberToDelete.id}`)
        : await apiClient.post('/form-data/hide', { email: memberToDelete.email });

      if (res.success) {
        setEntries(entries.filter(e => {
          if (memberToDelete.id) return e.id !== memberToDelete.id;
          return e.email !== memberToDelete.email;
        }));
        setMemberToDelete(null);
      } else {
        alert(res.error || 'Failed to delete member');
      }
    } catch {
      alert('Network error — could not delete member');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 mb-1">All Member Profiles</h1>
          <p className="text-sm text-gray-600">Browse and manage all registered members</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
        >
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
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
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
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">WhatsApp</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Institution</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Course</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Fees Status</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading...</td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No members found</td>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">{entry.phone || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.institution || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{entry.course || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(entry.fees)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => {
                            setSelectedMember(entry);
                            setIsViewModalOpen(true);
                            setCardError(null);
                            setCardSentFor(null);
                          }}
                          className="text-teal-600 hover:text-teal-700 font-medium"
                        >
                          View
                        </button>
                        <span className="text-gray-200">|</span>
                        {cardSentFor === entry.email ? (
                          <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Sent!
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSendCard(entry)}
                            disabled={sendingCardFor === entry.email || !entry.email}
                            className="flex items-center gap-1 text-xs text-gray-500 hover:text-teal-600 transition-colors disabled:opacity-40"
                            title="Resend Membership Card"
                          >
                            {sendingCardFor === entry.email ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Mail className="w-3.5 h-3.5" />
                            )}
                            Resend Card
                          </button>
                        )}
                        <span className="text-gray-200">|</span>
                        <button
                          onClick={() => setMemberToDelete(entry)}
                          className="text-red-400 hover:text-red-600 transition-colors"
                          title="Delete Member"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md my-8">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">Add New Member</h2>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddMember} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input 
                    type="text" 
                    required
                    value={newMember.name}
                    onChange={(e) => setNewMember({...newMember, name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Enter full name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <input 
                    type="email" 
                    required
                    value={newMember.email}
                    onChange={(e) => setNewMember({...newMember, email: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Enter email address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number</label>
                  <input 
                    type="text" 
                    value={newMember.phone}
                    onChange={(e) => setNewMember({...newMember, phone: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="e.g. 93664xxxxx"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Institution</label>
                    <input 
                      type="text" 
                      value={newMember.institution}
                      onChange={(e) => setNewMember({...newMember, institution: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="School/College"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                    <input 
                      type="text" 
                      value={newMember.course}
                      onChange={(e) => setNewMember({...newMember, course: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="e.g. B.Tech"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <textarea 
                    value={newMember.address}
                    onChange={(e) => setNewMember({...newMember, address: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Residential address"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
                    <input 
                      type="text" 
                      value={newMember.bloodGroup}
                      onChange={(e) => setNewMember({...newMember, bloodGroup: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="e.g. O+"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fees Paid?</label>
                    <select 
                      value={newMember.fees}
                      onChange={(e) => setNewMember({...newMember, fees: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                </div>
                </div>

              <div className="mt-8 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isViewModalOpen && selectedMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden my-8">
            <div className="relative h-28 bg-teal-600 flex-shrink-0">
              <button 
                onClick={() => setIsViewModalOpen(false)}
                className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="absolute -bottom-10 left-8">
                <div className="w-20 h-20 rounded-2xl bg-white shadow-md flex items-center justify-center border-4 border-white">
                  <span className="text-3xl font-bold text-teal-600">
                    {selectedMember.name?.charAt(0) || '?'}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-14 pb-6 px-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedMember.name || 'Unknown Member'}</h2>
                  <p className="text-gray-500">{selectedMember.email || 'No email provided'}</p>
                </div>
                {getStatusBadge(selectedMember.fees)}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">WhatsApp</p>
                  <p className="text-gray-900 font-semibold font-mono">{selectedMember.phone || 'N/A'}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Blood Group</p>
                  <p className="text-gray-900 font-semibold">{selectedMember.bloodGroup || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 mb-4">
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Institution</p>
                  <p className="text-gray-900 font-semibold">{selectedMember.institution || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 mb-4">
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Course / Occupation</p>
                  <p className="text-gray-900 font-semibold">{selectedMember.course || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 mb-6">
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Address</p>
                  <p className="text-gray-900 text-sm whitespace-pre-wrap">{selectedMember.address || 'N/A'}</p>
                </div>
              </div>

              {/* Membership Card Preview (Exact Model Replication) */}
              <div className="mt-4 border border-gray-100 rounded-2xl overflow-hidden shadow-sm bg-white font-sans">
                {/* Header Bar */}
                <div className="bg-gray-50 py-2 border-b border-gray-100 flex items-center justify-center gap-3">
                  <img src="/logo.png" alt="" className="w-6 h-6 object-contain" />
                  <span className="text-[10px] font-bold text-[#2e3859] tracking-widest uppercase">Delhi Mizo Zirlai Pawl</span>
                  <img src="/logo.png" alt="" className="w-6 h-6 object-contain" />
                </div>

                <div className="p-4">
                  {/* Card Title */}
                  <div className="text-center mb-4">
                    <h4 className="text-[#2e3859] text-lg font-extrabold tracking-tight">MEMBERSHIP CARD 2026-27</h4>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Left Side: Large Logo */}
                    <div className="w-1/3 flex justify-center">
                      <img src="/logo.png" alt="Logo" className="w-24 h-24 object-contain" />
                    </div>

                    {/* Right Side: Dark Blue Info Box */}
                    <div className="w-2/3 bg-[#3f4a73] rounded-3xl p-5 text-white shadow-inner">
                      <div className="space-y-2 text-[11px]">
                        <div className="flex">
                          <span className="w-20 font-bold">Name</span>
                          <span className="mx-1">:</span>
                          <span className="flex-1 truncate">{selectedMember.name}</span>
                        </div>
                        <div className="flex">
                          <span className="w-20 font-bold">ID number</span>
                          <span className="mx-1">:</span>
                          <span className="flex-1 font-mono tracking-tighter italic opacity-90">{selectedMember.id || 'Pending'}</span>
                        </div>
                        <div className="flex">
                          <span className="w-20 font-bold">Blood group</span>
                          <span className="mx-1">:</span>
                          <span className="flex-1">{selectedMember.bloodGroup || 'N/A'}</span>
                        </div>
                        <div className="flex">
                          <span className="w-20 font-bold">Address</span>
                          <span className="mx-1">:</span>
                          <span className="flex-1 line-clamp-2 leading-tight opacity-90">{selectedMember.address || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dotted Pattern Decor */}
                <div className="px-6 pb-4 opacity-20">
                  <div className="flex gap-2">
                    {[...Array(8)].map((_, i) => <div key={i} className="w-1 h-1 bg-gray-400 rounded-full" />)}
                  </div>
                  <div className="flex gap-2 mt-1">
                    {[...Array(8)].map((_, i) => <div key={i} className="w-1 h-1 bg-gray-400 rounded-full" />)}
                  </div>
                </div>
              </div>

              {/* Send Card Actions */}
              {cardError && (
                <div className="mb-4 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {cardError}
                </div>
              )}
              {cardSentFor === selectedMember.email && (
                <div className="mb-4 px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Membership card sent successfully!
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setIsViewModalOpen(false)}
                  className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
                >
                  Close
                </button>
                <button 
                  onClick={() => handleSendCard(selectedMember)}
                  disabled={sendingCardFor === selectedMember.email || !selectedMember.email}
                  className="flex items-center gap-2 px-5 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium text-sm disabled:opacity-50"
                >
                  {sendingCardFor === selectedMember.email ? (
                    <><RefreshCw className="w-4 h-4 animate-spin" /> Sending...</>
                  ) : (
                    <><Mail className="w-4 h-4" /> Send Card to Email</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {memberToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="text-gray-900 font-bold">Delete Member?</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6 font-medium">
              Are you sure you want to delete <span className="text-gray-900 font-bold">{memberToDelete.name}</span>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setMemberToDelete(null)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm font-semibold transition-colors"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteMember}
                disabled={isDeleting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete Member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
