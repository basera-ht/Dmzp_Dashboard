import { useState, useEffect, useCallback } from 'react';
import { MetricCard } from '../components/MetricCard';
import { UpcomingEvents } from '../components/UpcomingEvents';
import { DemographicsDonutChart } from '../components/DemographicsDonutChart';
import { MemberActivityTable } from '../components/MemberActivityTable';
import { apiClient } from '../../lib/api';
import { RefreshCw } from 'lucide-react';

interface FormStats {
  totalMembers: number;
  totalFees: number;
  byYear: Record<string, number>;
  byMonth: Record<string, number>;
}

export function Dashboard() {
  const [stats, setStats] = useState<FormStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const response = await apiClient.get<FormStats>('/form-data/stats?refresh=' + Date.now());
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (err) {
      // Silent fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchStats(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchStats]);

  const handleRefresh = () => {
    fetchStats(true);
  };

  const totalMembers = stats?.totalMembers ?? 0;
  const totalFees = stats?.totalFees ?? 0;
  const byYear = stats?.byYear ?? {};
  const topYear = Object.entries(byYear).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
  const activeChapters = 5;

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 mb-1">DMZP Association Dashboard</h1>
          <p className="text-sm text-gray-600">Track DMZP member activity and chapter performance</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
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
