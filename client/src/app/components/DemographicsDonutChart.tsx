import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const data = [
  { name: '18-24', value: 425, color: '#14b8a6' },
  { name: '25-34', value: 580, color: '#0891b2' },
  { name: '35-44', value: 310, color: '#1e3a8a' },
  { name: '45+', value: 137, color: '#9333ea' },
];

const totalMembers = data.reduce((sum, item) => sum + item.value, 0);

const renderCenterLabel = () => {
  return (
    <text
      x="50%"
      y="50%"
      textAnchor="middle"
      dominantBaseline="middle"
      key="donut-center-label"
    >
      <tspan key="donut-total-number" x="50%" dy="-0.5em" fontSize="24" fontWeight="600" fill="#111827">
        {totalMembers.toLocaleString()}
      </tspan>
      <tspan key="donut-total-text" x="50%" dy="1.5em" fontSize="12" fill="#6b7280">
        Total Members
      </tspan>
    </text>
  );
};

export function DemographicsDonutChart() {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100" key="donut-chart-container">
      <h3 className="text-gray-900 mb-6">Member Demographics (Age Range)</h3>
      <ResponsiveContainer width="100%" height={300} key="donut-responsive">
        <PieChart key="demographics-pie-chart">
          <Pie
            key="demographics-pie"
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            isAnimationActive={false}
          >
            {data.map((entry, index) => (
              <Cell key={`donut-cell-${entry.name}-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            key="donut-tooltip"
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          />
          <Legend
            key="donut-legend"
            verticalAlign="middle"
            align="right"
            layout="vertical"
            iconType="circle"
          />
          {renderCenterLabel()}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
