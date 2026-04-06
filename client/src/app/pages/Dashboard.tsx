import { MetricCard } from '../components/MetricCard';
import { UpcomingEvents } from '../components/UpcomingEvents';
import { DemographicsDonutChart } from '../components/DemographicsDonutChart';
import { MemberActivityTable } from '../components/MemberActivityTable';

export function Dashboard() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-1">Dashboard: Regional Chapter Analysis</h1>
        <p className="text-sm text-gray-600">Track member activity and chapter performance</p>
      </div>

      <div className="grid grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Total Registered Members"
          value="1,452"
          trend={{ value: '+5%', positive: true }}
        />
        <MetricCard
          title="Active Chapters"
          value="28"
        />
        <MetricCard
          title="New Signups (Last 30 Days)"
          value="210"
        />
        <MetricCard
          title="Most Active Region"
          value="South Asia"
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
