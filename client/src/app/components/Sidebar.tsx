import { LayoutDashboard, Users, FileText, Settings, User, CalendarDays } from 'lucide-react';
import { NavLink } from 'react-router';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard',    path: '/'          },
  { icon: Users,           label: 'All Profiles', path: '/profiles'  },
  { icon: CalendarDays,    label: 'Events',       path: '/events'    },
  { icon: FileText,        label: 'Reports',      path: '/reports'   },
  { icon: Settings,        label: 'Settings',     path: '/settings'  },
];

export function Sidebar() {
  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen">
      <div className="p-6">
        <h2 className="text-primary">DMZP</h2>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.label}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-teal-50 text-teal-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center">
            <User className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-gray-900">Admin User</p>
            <p className="text-xs text-gray-500">admin@impact.org</p>
          </div>
        </div>
      </div>
    </div>
  );
}
