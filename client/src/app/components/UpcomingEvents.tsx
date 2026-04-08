import { useState, useEffect } from 'react';
import { Calendar, MapPin, Users, Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import { apiClient } from '../../lib/api';

interface Event {
  id: number;
  title: string;
  date: string;
  time: string;
  location: string;
  attendees?: number;
  status?: string;
}

const COLORS = [
  { bg: 'bg-teal-50',   border: 'border-teal-200'   },
  { bg: 'bg-blue-50',   border: 'border-blue-200'   },
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

export function UpcomingEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      try {
        // fetch only 2 — the two soonest upcoming events
        const response = await apiClient.get<Event[]>('/events/upcoming?limit=2');
        if (response.success && Array.isArray(response.data)) {
          setEvents(response.data);
        } else {
          setEvents([]);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, []);

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-gray-900">Upcoming Events</h3>
        <Link
          to="/events"
          className="flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700 transition-colors"
        >
          View all
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500 text-sm">Loading…</div>
      ) : events.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">
          <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          No upcoming events
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event, index) => {
            const c = COLORS[index % COLORS.length];
            return (
              <div
                key={event.id}
                className={`${c.bg} ${c.border} border rounded-xl p-4 transition-all hover:shadow-sm`}
              >
                <h4 className="text-gray-900 font-medium text-sm mb-3 truncate">{event.title}</h4>
                <div className="space-y-1.5 text-xs text-gray-600">
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
  );
}
