import { Outlet } from 'react-router';
import { Sidebar } from '../components/Sidebar';
import { Menu } from 'lucide-react';
import { useState } from 'react';

export function Root() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar mobileOpen={mobileSidebarOpen} onMobileOpenChange={setMobileSidebarOpen} />
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="md:hidden sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="p-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
            aria-label="Open navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
          <p className="text-sm font-semibold text-gray-900">DMZP Dashboard</p>
          <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
        </div>
        <Outlet />
      </main>
    </div>
  );
}
