'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';

type Props = {
  data: {
    byAssetClass: { stock: number; crypto: number; cash: number };
  };
};

const BARS = [
  { key: 'stock', label: '주식', color: '#3b82f6' },
  { key: 'crypto', label: '코인', color: '#8b5cf6' },
  { key: 'cash', label: '현금', color: '#22c55e' },
] as const;

export function AssetClassPerformanceChart({ data }: Props) {
  const total =
    (data.byAssetClass?.stock ?? 0) +
    (data.byAssetClass?.crypto ?? 0) +
    (data.byAssetClass?.cash ?? 0);

  if (!data.byAssetClass || total === 0) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-gray-800">자산군별 비중</h2>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
            이달 데이터가 충분하지 않습니다
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = BARS.map(({ key, label, color }) => ({
    name: label,
    value: data.byAssetClass[key],
    color,
  }));

  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold text-gray-800">자산군별 비중</h2>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value) => [`${value}%`, '비중']} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
