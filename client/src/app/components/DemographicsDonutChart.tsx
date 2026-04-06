import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { apiClient } from '../../lib/api';

interface FormStats {
  totalMembers: number;
  totalFees: number;
  byYear: Record<string, number>;
  byMonth: Record<string, number>;
}

const COLORS = ['#14b8a6', '#0891b2', '#1e3a8a', '#9333ea', '#dc2626', '#ea580c', '#ca8a04', '#16a34a'];

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

  const data = stats?.byYear 
    ? Object.entries(stats.byYear).map(([name, value]) => ({ name, value }))
    : [];
  
  const totalMembers = stats?.totalMembers ?? 0;

  const renderCenterLabel = () => {
    if (loading) return null;
    return (
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
        <tspan x="50%" dy="-0.5em" fontSize="24" fontWeight="600" fill="#111827">
          {totalMembers.toLocaleString()}
        </tspan>
        <tspan x="50%" dy="1.5em" fontSize="12" fill="#6b7280">
          Total Members
        </tspan>
      </text>
    );
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-gray-900 mb-6">Member Distribution by Year</h3>
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
            {renderCenterLabel()}
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
