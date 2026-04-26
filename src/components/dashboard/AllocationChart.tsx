'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { usePortfolioSummary } from '@/hooks/use-portfolio-summary';
import { formatKRW } from '@/lib/format-currency';

interface TooltipPayload {
  name: string;
  value: number;
  payload: { percentage: number };
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm text-sm">
      <p className="font-semibold text-gray-900">{item.name}</p>
      <p className="text-gray-600">{formatKRW(item.value)}</p>
      <p className="text-gray-500">{item.payload.percentage.toFixed(1)}%</p>
    </div>
  );
}

export function AllocationChart() {
  const { summary } = usePortfolioSummary();
  const { allocations } = summary;

  if (allocations.length < 2) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        2개 이상의 자산을 추가하면 차트가 표시됩니다
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={allocations}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={80}
          innerRadius={45}
        >
          {allocations.map((entry, index) => (
            <Cell key={entry.ticker} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value) => <span className="text-xs text-gray-600">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
