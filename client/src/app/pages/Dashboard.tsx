import { useState, useEffect } from 'react';
import { MetricCard } from '../components/MetricCard';
import { UpcomingEvents } from '../components/UpcomingEvents';
import { DemographicsDonutChart } from '../components/DemographicsDonutChart';
import { MemberActivityTable } from '../components/MemberActivityTable';
import { apiClient } from '../../lib/api';

interface FormStats {
  totalMembers: number;
  totalFees: number;
  byYear: Record<string, number>;
  byMonth: Record<string, number>;
}

export function Dashboard() {
  const [stats, setStats] = useState<FormStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await apiClient.get<FormStats>('/form-data/stats');
        if (response.success && response.data) {
          setStats(response.data);
        }
      } catch (err) {
        // Silent fail - keep showing loading or cached data
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const totalMembers = stats?.totalMembers ?? 0;
  const totalFees = stats?.totalFees ?? 0;
  const byYear = stats?.byYear ?? {};
  const topYear = Object.entries(byYear).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
  const activeChapters = 5;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-1">Dashboard: Regional Chapter Analysis</h1>
        <p className="text-sm text-gray-600">Track member activity and chapter performance</p>
      </div>

      <div className="grid grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Total Registered Members"
          value={loading ? '...' : totalMembers.toLocaleString()}
          trend={totalMembers > 0 ? { value: '+5%', positive: true } : undefined}
        />
        <MetricCard
          title="Active Chapters"
          value={loading ? '...' : activeChapters.toString()}
        />
        <MetricCard
          title="Fees Collected"
          value={loading ? '...' : totalFees.toString()}
        />
        <MetricCard
          title="Most Active Year"
          value={loading ? '...' : topYear}
        />
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <UpcomingEvents />
        <DemographicsDonutChart />
      </div>

      <MemberActivityTable />
    </div>
  );
}
