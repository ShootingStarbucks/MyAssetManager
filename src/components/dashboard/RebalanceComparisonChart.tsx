'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface RebalanceComparisonChartProps {
  currentAllocations: { stock: number; crypto: number; cash: number };
  targetAllocations: { stock: number; crypto: number; cash: number };
}

export function RebalanceComparisonChart({
  currentAllocations,
  targetAllocations,
}: RebalanceComparisonChartProps) {
  const chartData = [
    {
      name: '주식',
      current: currentAllocations.stock,
      target: targetAllocations.stock,
    },
    {
      name: '암호화폐',
      current: currentAllocations.crypto,
      target: targetAllocations.crypto,
    },
    {
      name: '현금',
      current: currentAllocations.cash,
      target: targetAllocations.cash,
    },
  ];

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={chartData} layout="vertical">
        <XAxis
          type="number"
          domain={[0, 100]}
          tickFormatter={(value: number) => `${Math.round(value)}%`}
          tick={{ fontSize: 12 }}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 12 }}
          width={56}
        />
        <Tooltip
          formatter={(value, name) => [
            `${Math.round(typeof value === 'number' ? value : Number(value))}%`,
            name === 'current' ? '현재' : '목표',
          ]}
        />
        <Legend
          formatter={(value: string) =>
            value === 'current' ? '현재' : '목표'
          }
        />
        <Bar dataKey="current" name="current" fill="#3b82f6" />
        <Bar dataKey="target" name="target" fill="#94a3b8" />
      </BarChart>
    </ResponsiveContainer>
  );
}
