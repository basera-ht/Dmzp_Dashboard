import { Outlet } from 'react-router';
import { Sidebar } from '../components/Sidebar';

export function Root() {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
