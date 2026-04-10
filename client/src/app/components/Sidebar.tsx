import { LayoutDashboard, Users, FileText, Settings, User, CalendarDays, LogOut } from 'lucide-react';
import { NavLink } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { Drawer, DrawerContent } from './ui/drawer';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard',    path: '/'          },
  { icon: Users,           label: 'All Profiles', path: '/profiles'  },
  { icon: CalendarDays,    label: 'Events',       path: '/events'    },
  { icon: FileText,        label: 'Reports',      path: '/reports'   },
  { icon: Settings,        label: 'Settings',     path: '/settings'  },
];

interface SidebarProps {
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { logout, user } = useAuth();

  return (
    <>
      <div className="p-6 flex flex-col items-center border-b border-gray-50 mb-2">
        <img src="/logo.png" alt="Logo" className="w-36 h-36 object-contain" />
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.label}
              to={item.path}
              end={item.path === '/'}
              onClick={onNavigate}
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
    </>
  );
}

export function Sidebar({ mobileOpen, onMobileOpenChange }: SidebarProps) {
  return (
    <>
      <div className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col h-screen shrink-0">
        <SidebarContent />
      </div>

      <Drawer open={mobileOpen} onOpenChange={onMobileOpenChange} direction="left">
        <DrawerContent className="bg-white p-0">
          <div className="flex flex-col h-full">
            <SidebarContent onNavigate={() => onMobileOpenChange(false)} />
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
