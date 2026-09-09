import { useState, useEffect, useRef } from 'react';
import {
  Calendar, MapPin, Users, Clock, Plus, Edit2, Trash2, X,
  Search, CalendarDays, CheckCircle2, XCircle, Loader2, Mail, Upload,
} from 'lucide-react';
import { apiClient } from '../../lib/api';
import { EmailBroadcastModal } from '../components/EmailBroadcastModal';

interface Event {
  id: number;
  title: string;
  date: string;
  time?: string;
  location?: string;
  attendees?: number;
  status?: string;
  description?: string;
  posterUrl?: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  Upcoming: 'bg-teal-100 text-teal-700',
  Ongoing: 'bg-blue-100 text-blue-700',
  Completed: 'bg-green-100 text-green-700',
  Cancelled: 'bg-red-100 text-red-700',
};

const CARD_COLORS = [
  { bg: 'bg-teal-50', border: 'border-teal-200', icon: 'text-teal-600' },
  { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600' },
  { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'text-purple-600' },
  { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'text-orange-600' },
  { bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-600' },
];

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

interface ModalProps {
  event?: Event | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Event>) => void;
  isSaving: boolean;
}

function EventModal({ event, isOpen, onClose, onSave, isSaving }: ModalProps) {
  const [form, setForm] = useState({
    title: '',
    date: '',
    time: '',
    location: '',
    attendees: 0,
    status: 'Upcoming',
    description: '',
  });

  useEffect(() => {
    if (event) {
      setForm({
        title: event.title || '',
        date: event.date ? event.date.split('T')[0] : '',
        time: event.time || '',
        location: event.location || '',
        attendees: event.attendees || 0,
        status: event.status || 'Upcoming',
        description: event.description || '',
      });
    } else {
      setForm({
        title: '',
        date: '',
        time: '',
        location: '',
        attendees: 0,
        status: 'Upcoming',
        description: '',
      });
    }
  }, [event, isOpen]);

  if (!isOpen) return null;
  const isDateValid = form.date ? !Number.isNaN(new Date(form.date).getTime()) : false;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 w-full max-w-lg max-h-[min(92vh,760px)] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-teal-600" />
            </div>
            <h3 className="text-gray-900 font-semibold">{event ? 'Edit Event' : 'New Event'}</h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Event title"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
              <input
                type="time"
                value={form.time}
                onChange={e => setForm({ ...form, time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input
              type="text"
              value={form.location}
              onChange={e => setForm({ ...form, location: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="e.g. Community Hall, Aizawl"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              rows={3}
              placeholder="Event description (optional)"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expected Attendees</label>
              <input
                type="number"
                value={form.attendees}
                onChange={e => setForm({ ...form, attendees: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option>Upcoming</option>
                <option>Ongoing</option>
                <option>Completed</option>
                <option>Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={isSaving || !form.title.trim() || !isDateValid}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 text-sm"
          >
            {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : event ? 'Update' : 'Create Event'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirm({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
            <XCircle className="w-5 h-5 text-red-500" />
          </div>
          <h3 className="text-gray-900 font-semibold">Delete Event?</h3>
        </div>
        <p className="text-sm text-gray-600 mb-5">This action cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm transition-colors">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

const TABS = ['All', 'Upcoming', 'Ongoing', 'Completed', 'Cancelled'] as const;
type Tab = typeof TABS[number];

export function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('All');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [uploadingPoster, setUploadingPoster] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchEvents = async () => {
    try {
      const response = await apiClient.get<{ data: Event[] }>('/events?limit=100');
      if (response.success && response.data) {
        const eventsData = response.data.data || [];
        
        const eventsWithPosters = await Promise.all(
          eventsData.map(async (event) => {
            try {
              const posterRes = await apiClient.get<{ posterUrl: string | null }>(`/events/${event.id}/poster`);
              return {
                ...event,
                posterUrl: posterRes.success && (posterRes.data as any)?.posterUrl ? (posterRes.data as any).posterUrl : null,
              };
            } catch {
              return { ...event, posterUrl: null };
            }
          })
        );
        
        setEvents(eventsWithPosters);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEvents(); }, []);

  const handleSave = async (data: any) => {
    setIsSaving(true);
    try {
      const parsedDate = new Date(data.date);
      if (Number.isNaN(parsedDate.getTime())) {
        alert('Please enter a valid event date.');
        return;
      }
      const payload = {
        title: data.title?.trim(),
        date: parsedDate.toISOString(),
        time: data.time || 'TBD',
        location: data.location || 'TBD',
        attendees: data.attendees || 0,
        status: data.status,
        description: data.description || undefined,
      };

      let response;
      if (editingEvent) {
        response = await apiClient.put(`/events/${editingEvent.id}`, payload);
      } else {
        response = await apiClient.post('/events', payload);
      }

      if (response.success) {
        setModalOpen(false);
        setEditingEvent(null);
        await fetchEvents();
      } else {
        alert((response.error as string) || 'Failed to save event.');
      }
    } catch (error: any) {
      alert(error?.message || 'An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId === null) return;
    try {
      await apiClient.delete(`/events/${deleteId}`);
      setDeleteId(null);
      await fetchEvents();
    } catch {
      alert('Failed to delete event.');
    }
  };

  const openEmailModal = (event: Event) => {
    setSelectedEvent(event);
    setEmailModalOpen(true);
  };

  const handleUploadClick = (eventId: number) => {
    if (fileInputRef.current) {
      fileInputRef.current.dataset.eventId = String(eventId);
      fileInputRef.current.click();
    }
  };

  const handlePosterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const eventId = e.target.dataset.eventId;
    
    if (!file || !eventId) return;
    
    setUploadingPoster(parseInt(eventId));
    
    try {
      const formData = new FormData();
      formData.append('poster', file);
      
      const result = await apiClient.postForm(`/events/${eventId}/poster`, formData);
      
      if (result.success) {
        await fetchEvents();
      } else {
        alert(result.error || 'Failed to upload poster');
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Failed to upload poster');
    } finally {
      setUploadingPoster(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeletePoster = async (eventId: number) => {
    try {
      await apiClient.delete(`/events/${eventId}/poster`);
      await fetchEvents();
    } catch {
      alert('Failed to delete poster');
    }
  };

  const total = events.length;
  const upcoming = events.filter(e => e.status === 'Upcoming').length;
  const completed = events.filter(e => e.status === 'Completed').length;
  const totalAttendees = events.reduce((s, e) => s + (e.attendees || 0), 0);

  const filtered = events.filter(e => {
    const matchTab = tab === 'All' || e.status === tab;
    const matchSearch = e.title.toLowerCase().includes(search.toLowerCase()) ||
      (e.location || '').toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*,.pdf"
        onChange={handlePosterUpload}
        className="hidden"
      />
      
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-gray-900 mb-1">Events</h1>
          <p className="text-sm text-gray-600">Manage all DMZP events</p>
        </div>
        <button
          onClick={() => { setEditingEvent(null); setModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Event
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        {[
          { label: 'Total Events', value: loading ? '…' : total.toString(), icon: CalendarDays, color: 'teal' },
          { label: 'Upcoming', value: loading ? '…' : upcoming.toString(), icon: Calendar, color: 'blue' },
          { label: 'Completed', value: loading ? '…' : completed.toString(), icon: CheckCircle2, color: 'green' },
          { label: 'Total Attendees', value: loading ? '…' : totalAttendees.toLocaleString(), icon: Users, color: 'purple' },
        ].map(card => {
          const Icon = card.icon;
          const colorMap: Record<string, string> = {
            teal: 'bg-teal-50 text-teal-600',
            blue: 'bg-blue-50 text-blue-600',
            green: 'bg-green-50 text-green-600',
            purple: 'bg-purple-50 text-purple-600',
          };
          return (
            <div key={card.label} className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 min-w-0">
              <div className={`w-11 h-11 rounded-lg ${colorMap[card.color]} flex items-center justify-center mb-4`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-xl sm:text-2xl font-semibold text-gray-900 mb-1">{card.value}</p>
              <p className="text-xs sm:text-sm text-gray-500 leading-tight break-words">{card.label}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex gap-1">
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t
                    ? 'bg-teal-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                  }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search events…"
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 w-56"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <CalendarDays className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p>No events found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-6">
            {filtered.map((event, idx) => {
              const c = CARD_COLORS[idx % CARD_COLORS.length];
              const isUploading = uploadingPoster === event.id;
              return (
                <div
                  key={event.id}
                  className={`${c.bg} ${c.border} border rounded-xl p-5 hover:shadow-md transition-all`}
                >
                  <div className="relative mb-5 group overflow-hidden rounded-xl h-44 bg-white ring-1 ring-gray-100 shadow-sm transition-all duration-300 hover:shadow-md">
                    {event.posterUrl ? (
                      <>
                        <img
                          src={event.posterUrl}
                          alt={event.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              parent.classList.add('bg-gradient-to-br', 'from-teal-50', 'to-blue-50');
                              if (!parent.querySelector('.fallback-icon')) {
                                const fallback = document.createElement('div');
                                fallback.className = 'fallback-icon absolute inset-0 flex items-center justify-center opacity-40';
                                fallback.innerHTML = `
                                  <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" stroke-width="1" fill="none" class="text-teal-600">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                    <line x1="16" y1="2" x2="16" y2="6"/>
                                    <line x1="8" y1="2" x2="8" y2="6"/>
                                    <line x1="3" y1="10" x2="21" y2="10"/>
                                  </svg>
                                `;
                                parent.appendChild(fallback);
                              }
                            }
                          }}
                        />
                        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                        
                        <button
                          onClick={() => handleDeletePoster(event.id)}
                          className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm text-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-sm hover:bg-red-500 hover:text-white z-10"
                          title="Remove poster"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleUploadClick(event.id)}
                        disabled={isUploading}
                        className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gray-50/50 hover:bg-white transition-colors group"
                      >
                        {isUploading ? (
                          <Loader2 className="w-6 h-6 text-teal-500 animate-spin" />
                        ) : (
                          <>
                            <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-400 group-hover:text-teal-600 transition-colors">
                              <Upload className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-medium text-gray-500 group-hover:text-teal-600 transition-colors">Add event poster</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm`}>
                        <CalendarDays className={`w-4 h-4 ${c.icon}`} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-gray-900 font-semibold text-sm leading-tight truncate">{event.title}</h4>
                        {event.status && (
                          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[event.status] || 'bg-gray-100 text-gray-600'}`}>
                            {event.status}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button
                        onClick={() => openEmailModal(event)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-white/60"
                        title="Send Email"
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => { setEditingEvent(event); setModalOpen(true); }}
                        className="p-1.5 text-gray-400 hover:text-teal-600 transition-colors rounded-lg hover:bg-white/60"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteId(event.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-white/60"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span>{formatDate(event.date)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>{event.time || 'TBD'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{event.location || 'TBD'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 shrink-0" />
                      <span>{event.attendees || 0} registered</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <EventModal
        event={editingEvent}
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingEvent(null); }}
        onSave={handleSave}
        isSaving={isSaving}
      />

      {deleteId !== null && (
        <DeleteConfirm
          onCancel={() => setDeleteId(null)}
          onConfirm={handleDelete}
        />
      )}

      <EmailBroadcastModal
        event={selectedEvent}
        isOpen={emailModalOpen}
        onClose={() => { setEmailModalOpen(false); setSelectedEvent(null); }}
      />
    </div>
  );
}
