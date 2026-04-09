import { LayoutDashboard, Users, FileText, Settings, User, CalendarDays, LogOut } from 'lucide-react';
import { NavLink } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard',    path: '/'          },
  { icon: Users,           label: 'All Profiles', path: '/profiles'  },
  { icon: CalendarDays,    label: 'Events',       path: '/events'    },
  { icon: FileText,        label: 'Reports',      path: '/reports'   },
  { icon: Settings,        label: 'Settings',     path: '/settings'  },
];

export function Sidebar() {
  const { logout, user } = useAuth();

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen">
      <div className="p-6 flex flex-col items-center border-b border-gray-50 mb-2">
        <img src="/logo.png" alt="Logo" className="w-40 h-40 object-contain" />
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

      <div className="p-4 border-t border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-3 px-2 py-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center shadow-sm">
            <User className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{user?.name || 'Admin User'}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email || 'admin@dmzp.org'}</p>
          </div>
        </div>
        <button 
          onClick={() => logout()}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
