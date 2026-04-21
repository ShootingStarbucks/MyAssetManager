'use client';

import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';

interface RiskGaugeChartProps {
  riskProfile: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
}

const RISK_CONFIG = {
  CONSERVATIVE: { value: 33, fill: '#10b981', label: '보수적' },
  MODERATE: { value: 66, fill: '#f59e0b', label: '중립적' },
  AGGRESSIVE: { value: 100, fill: '#ef4444', label: '공격적' },
} as const;

export function RiskGaugeChart({ riskProfile }: RiskGaugeChartProps) {
  const config = RISK_CONFIG[riskProfile];
  const chartData = [{ value: config.value, fill: config.fill }];

  return (
    <div className="relative" style={{ height: 160 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          data={chartData}
          innerRadius="60%"
          outerRadius="80%"
          startAngle={180}
          endAngle={0}
        >
          <RadialBar dataKey="value" background={{ fill: '#e2e8f0' }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div
        className="absolute inset-0 flex items-end justify-center"
        style={{ paddingBottom: '16px' }}
      >
        <span
          className="text-sm font-semibold"
          style={{ color: config.fill }}
        >
          {config.label}
        </span>
      </div>
    </div>
  );
}
