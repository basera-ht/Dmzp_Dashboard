import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, Label } from 'recharts';
import { apiClient } from '../../lib/api';

interface FormStats {
  totalMembers: number;
  totalFees: number;
  byInstitution: Record<string, number>;
  byBloodGroup: Record<string, number>;
  byCourse: Record<string, number>;
}

const COLORS = ['#14b8a6', '#0891b2', '#1e3a8a', '#9333ea', '#dc2626', '#ea580c', '#ca8a04', '#16a34a'];

interface CenterLabelProps {
  viewBox?: { cx?: number; cy?: number };
  totalMembers: number;
}

function CenterLabel({ viewBox, totalMembers }: CenterLabelProps) {
  const cx = viewBox?.cx ?? 0;
  const cy = viewBox?.cy ?? 0;
  return (
    <text textAnchor="middle" dominantBaseline="middle">
      <tspan x={cx} y={cy - 10} fontSize="24" fontWeight="600" fill="#111827">
        {totalMembers.toLocaleString()}
      </tspan>
      <tspan x={cx} y={cy + 14} fontSize="12" fill="#6b7280">
        Total Members
      </tspan>
    </text>
  );
}

export function DemographicsDonutChart() {
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
        // Silent fail
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  const data = stats?.byCourse
    ? Object.entries(stats.byCourse).map(([name, value]) => ({ name, value }))
    : [];

  const totalMembers = stats?.totalMembers ?? 0;

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-gray-900 mb-6">Member Distribution by Course</h3>
      {loading ? (
        <div className="h-[300px] flex items-center justify-center text-gray-500">Loading...</div>
      ) : data.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-gray-500">No data available</div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              isAnimationActive={false}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
              <Label
                content={(props) => (
                  <CenterLabel
                    viewBox={props.viewBox as { cx?: number; cy?: number }}
                    totalMembers={totalMembers}
                  />
                )}
                position="center"
              />
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
            />
            <Legend
              verticalAlign="middle"
              align="right"
              layout="vertical"
              iconType="circle"
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
