'use client';

import { useContext } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePortfolioSummary } from '@/hooks/use-portfolio-summary';
import { PeriodContext } from './DashboardShell';
import { usePeriodReturns } from '@/hooks/use-period-returns';
import { Card, CardContent } from '@/components/ui/Card';
import { ChangeBadge } from '@/components/ui/Badge';
import { formatKRW, formatPercent } from '@/lib/format-currency';
import { Spinner } from '@/components/ui/Spinner';
import type { ReturnPeriod } from '@/types/asset.types';

export function PortfolioSummaryCard() {
  const { summary, holdings: holdingsWithQuotes, isLoading, lastUpdatedAt } = usePortfolioSummary();
  const queryClient = useQueryClient();
  const { period, setPeriod } = useContext(PeriodContext);
  const { portfolioPeriodReturn, isLoading: isPeriodLoading } = usePeriodReturns(holdingsWithQuotes, period);

  function handleRefresh() {
    queryClient.invalidateQueries({ queryKey: ['quotes'] });
  }

  return (
    <Card>
      <CardContent>
        <div className="flex items-start justify-between mb-1">
          <span className="text-sm font-medium text-gray-500">총 자산</span>
          <button
            onClick={handleRefresh}
            className="text-gray-400 hover:text-blue-500 transition-colors"
            title="새로고침"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {isLoading && summary.holdingsCount === 0 ? (
          <div className="flex items-center gap-2 py-2">
            <Spinner size="sm" />
            <span className="text-gray-400 text-sm">불러오는 중...</span>
          </div>
        ) : (
          <>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {formatKRW(summary.totalValue)}
            </div>
            {/* 기간 선택 탭 */}
            <div className="flex gap-1 mb-3">
              {(['1M', '3M', '6M', '1Y', '전체'] as ReturnPeriod[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                    period === p
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* 기간 수익률 */}
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-500">기간 수익 ({period})</span>
              {isPeriodLoading ? (
                <Spinner size="sm" />
              ) : portfolioPeriodReturn?.returnPercent != null ? (
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${portfolioPeriodReturn.returnKRW! >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {portfolioPeriodReturn.returnKRW! >= 0 ? '+' : ''}
                    {portfolioPeriodReturn.returnKRW!.toLocaleString('ko-KR')}원
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${portfolioPeriodReturn.returnPercent >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {portfolioPeriodReturn.returnPercent >= 0 ? '+' : ''}
                    {portfolioPeriodReturn.returnPercent.toFixed(2)}%
                  </span>
                </div>
              ) : (
                <span className="text-sm text-gray-400">-</span>
              )}
            </div>

            <div className="flex items-center gap-2 mb-3">
              <ChangeBadge value={summary.totalChange} suffix="원" />
              <ChangeBadge value={summary.totalChangePercent} />
              <span className="text-xs text-gray-400">전일 대비</span>
            </div>
            <div className="text-xs text-gray-400">
              {summary.holdingsCount}개 자산
              {lastUpdatedAt && (
                <span className="ml-2">
                  · 업데이트 {lastUpdatedAt.toLocaleTimeString('ko-KR')}
                </span>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
