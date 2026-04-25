'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import { usePortfolioSummary } from '@/hooks/use-portfolio-summary';
import { calculateUnrealizedPnL } from '@/lib/calculate-portfolio';
import { getKrStockKoreanName } from '@/lib/kr-stock-names';
import type { HoldingWithQuote } from '@/types/portfolio.types';

interface ChartDataPoint {
  ticker: string;
  name: string;
  pnlPercent: number;
}

export function HoldingReturnBarChart() {
  const { holdings } = usePortfolioSummary();

  const chartData: ChartDataPoint[] = (holdings as HoldingWithQuote[])
    .filter((h) => h.avgCost != null && h.quote != null)
    .reduce<ChartDataPoint[]>((acc, h) => {
      const { unrealizedPnLPercent } = calculateUnrealizedPnL(h);
      if (unrealizedPnLPercent == null) return acc;
      const name =
        h.assetType === 'kr-stock'
          ? (getKrStockKoreanName(h.ticker) ?? h.name ?? h.ticker)
          : (h.name ?? h.ticker);
      acc.push({ ticker: h.ticker, name, pnlPercent: unrealizedPnLPercent });
      return acc;
    }, [])
    .sort((a, b) => b.pnlPercent - a.pnlPercent);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px]">
        <p className="text-sm text-gray-400">
          평균 단가를 입력하면 수익률이 표시됩니다
        </p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData}>
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={(value: number) => `${value}%`} tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={(value, _name, props) => {
            const v = typeof value === 'number' ? value : Number(value);
            const label = (props as { payload?: ChartDataPoint }).payload?.name ?? '';
            return [`${label}: ${v.toFixed(2)}%`];
          }}
        />
        <Bar dataKey="pnlPercent">
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.pnlPercent >= 0 ? '#16a34a' : '#dc2626'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
