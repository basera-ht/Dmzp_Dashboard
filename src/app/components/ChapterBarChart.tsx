import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const data = [
  { id: 'mumbai', chapter: 'Mumbai Metro', Student: 320, Professional: 180, Organization: 45 },
  { id: 'delhi', chapter: 'Delhi Central', Student: 280, Professional: 210, Organization: 35 },
  { id: 'bangalore', chapter: 'Bangalore Tech', Student: 290, Professional: 195, Organization: 40 },
  { id: 'chennai', chapter: 'Chennai Hub', Student: 250, Professional: 165, Organization: 30 },
  { id: 'kolkata', chapter: 'Kolkata Guild', Student: 220, Professional: 140, Organization: 25 },
];

export function ChapterBarChart() {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100" key="chapter-bar-chart-container">
      <h3 className="text-gray-900 mb-6">Top 5 Active Chapters by Member Type</h3>
      <ResponsiveContainer width="100%" height={300} key="chapter-bar-chart-responsive">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
          key="chapter-bar-chart"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" key="chapter-grid" />
          <XAxis type="number" stroke="#6b7280" key="chapter-x-axis" />
          <YAxis dataKey="chapter" type="category" stroke="#6b7280" width={90} key="chapter-y-axis" />
          <Tooltip
            key="chapter-tooltip"
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          />
          <Legend
            key="chapter-legend"
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="circle"
          />
          <Bar
            key="student-bar"
            dataKey="Student"
            stackId="a"
            fill="#14b8a6"
            isAnimationActive={false}
          />
          <Bar
            key="professional-bar"
            dataKey="Professional"
            stackId="a"
            fill="#0891b2"
            isAnimationActive={false}
          />
          <Bar
            key="organization-bar"
            dataKey="Organization"
            stackId="a"
            fill="#1e3a8a"
            radius={[0, 4, 4, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
