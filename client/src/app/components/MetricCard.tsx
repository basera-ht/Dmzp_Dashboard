import { TrendingUp } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  trend?: {
    value: string;
    positive: boolean;
  };
}

export function MetricCard({ title, value, trend }: MetricCardProps) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <p className="text-sm text-gray-600 mb-2">{title}</p>
      <div className="flex items-end justify-between">
        <h3 className="text-gray-900">{value}</h3>
        {trend && (
          <div className={`flex items-center gap-1 ${trend.positive ? 'text-green-600' : 'text-red-600'}`}>
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">{trend.value}</span>
          </div>
        )}
      </div>
    </div>
  );
}
