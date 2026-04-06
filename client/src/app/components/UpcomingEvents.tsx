import { Calendar, MapPin, Users, Clock } from 'lucide-react';

const events = [
  {
    id: 1,
    title: 'Annual Leadership Summit',
    date: 'April 15, 2026',
    time: '10:00 AM',
    location: 'Mumbai Convention Center',
    chapter: 'Mumbai Metro',
    attendees: 125,
    color: 'bg-teal-50 text-teal-700',
    borderColor: 'border-teal-200',
  },
  {
    id: 2,
    title: 'Community Outreach Program',
    date: 'April 18, 2026',
    time: '2:00 PM',
    location: 'Delhi Community Hall',
    chapter: 'Delhi Central',
    attendees: 78,
    color: 'bg-blue-50 text-blue-700',
    borderColor: 'border-blue-200',
  },
  {
    id: 3,
    title: 'Tech Workshop: Digital Skills',
    date: 'April 22, 2026',
    time: '9:00 AM',
    location: 'Bangalore Tech Hub',
    chapter: 'Bangalore Tech',
    attendees: 95,
    color: 'bg-purple-50 text-purple-700',
    borderColor: 'border-purple-200',
  },
  {
    id: 4,
    title: 'Networking Mixer',
    date: 'April 25, 2026',
    time: '6:00 PM',
    location: 'Chennai Business Center',
    chapter: 'Chennai Hub',
    attendees: 62,
    color: 'bg-orange-50 text-orange-700',
    borderColor: 'border-orange-200',
  },
  {
    id: 5,
    title: 'Youth Mentorship Program',
    date: 'April 28, 2026',
    time: '3:00 PM',
    location: 'Kolkata Youth Center',
    chapter: 'Kolkata Guild',
    attendees: 45,
    color: 'bg-green-50 text-green-700',
    borderColor: 'border-green-200',
  },
];

export function UpcomingEvents() {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-gray-900 mb-6">Upcoming Events</h3>
      <div className="space-y-4">
        {events.map((event) => (
          <div
            key={event.id}
            className={`border ${event.borderColor} rounded-lg p-4 ${event.color} transition-all hover:shadow-md`}
          >
            <div className="flex items-start justify-between mb-3">
              <h4 className="text-gray-900">{event.title}</h4>
              <span className="text-xs px-2 py-1 bg-white rounded-full text-gray-600">
                {event.chapter}
              </span>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>{event.date}</span>
              </div>

              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="w-4 h-4" />
                <span>{event.time}</span>
              </div>

              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>{event.location}</span>
              </div>

              <div className="flex items-center gap-2 text-gray-600">
                <Users className="w-4 h-4" />
                <span>{event.attendees} registered</span>
              </div>
            </div>

            <button className="mt-3 w-full py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-50 transition-colors text-sm">
              View Details
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
