'use client';

import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface Snapshot {
  id: string;
  snapDate: string;
  totalValue: number;
  breakdown: string;
  userId: string;
}

interface SnapshotsResponse {
  snapshots: Snapshot[];
}

function formatSnapDate(snapDate: string): string {
  const date = new Date(snapDate);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${mm}/${dd}`;
}

interface ChartDataPoint {
  date: string;
  value: number;
  rawValue: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: ChartDataPoint }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const rawValue = payload[0].payload.rawValue;
  return (
    <div className="rounded bg-white px-3 py-2 shadow-md border border-gray-200 text-sm">
      <p className="text-gray-500 mb-1">{label}</p>
      <p className="font-semibold text-gray-900">
        {rawValue.toLocaleString('ko-KR')}원
      </p>
    </div>
  );
}

export function PortfolioLineChart() {
  const { data, isLoading } = useQuery<SnapshotsResponse>({
    queryKey: ['snapshots'],
    queryFn: async () => {
      const res = await fetch('/api/snapshots');
      if (!res.ok) throw new Error('Failed to fetch snapshots');
      return res.json() as Promise<SnapshotsResponse>;
    },
  });

  if (isLoading) {
    return (
      <div className="h-[200px] w-full animate-pulse rounded-lg bg-gray-100" />
    );
  }

  const snapshots = data?.snapshots ?? [];
  // Reverse from descending to ascending order for the chart
  const ascending = [...snapshots].reverse();

  if (ascending.length < 3) {
    return (
      <div className="flex h-[200px] w-full items-center justify-center text-sm text-gray-400">
        데이터 수집 중 (최소 3개 스냅샷 필요)
      </div>
    );
  }

  const chartData: ChartDataPoint[] = ascending.map((s) => ({
    date: formatSnapDate(s.snapDate),
    value: Math.round(s.totalValue / 10000),
    rawValue: s.totalValue,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12, fill: '#6b7280' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: '#6b7280' }}
          tickLine={false}
          axisLine={false}
          label={{
            value: '만원',
            position: 'insideTopLeft',
            offset: 4,
            style: { fontSize: 11, fill: '#9ca3af' },
          }}
          tickFormatter={(v: number) => v.toLocaleString('ko-KR')}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
