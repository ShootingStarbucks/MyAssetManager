'use client';

import { useQueryClient } from '@tanstack/react-query';
import { usePortfolioSummary } from '@/hooks/use-portfolio-summary';
import { useCashAccounts } from '@/hooks/use-cash';
import { useExchangeRate } from '@/hooks/use-exchange-rate';
import { Card, CardContent } from '@/components/ui/Card';
import { ChangeBadge } from '@/components/ui/Badge';
import { formatKRW } from '@/lib/format-currency';
import { Spinner } from '@/components/ui/Spinner';

export function PortfolioSummaryCard() {
  const { summary, isLoading, lastUpdatedAt } = usePortfolioSummary();
  const { data: cashAccounts = [] } = useCashAccounts();
  const { exchangeRate } = useExchangeRate();
  const queryClient = useQueryClient();

  const cashTotal = cashAccounts.reduce((s, a) => s + a.amount, 0);

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
            <div className="text-3xl font-bold text-gray-900 mb-3">
              {formatKRW(summary.totalValue)}
            </div>

            {/* 평가손익 */}
            {summary.totalUnrealizedPnL !== null && (
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-500">평가손익</span>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium whitespace-nowrap ${summary.totalUnrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {summary.totalUnrealizedPnL >= 0 ? '+' : ''}
                    {summary.totalUnrealizedPnL.toLocaleString('ko-KR')}원
                  </span>
                  {summary.totalReturnPercent !== null && (
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${summary.totalReturnPercent >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {summary.totalReturnPercent >= 0 ? '+' : ''}
                      {summary.totalReturnPercent.toFixed(2)}%
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3">
              <div className="flex items-center gap-2">
                <ChangeBadge value={summary.totalChange} suffix="원" />
                <ChangeBadge value={summary.totalChangePercent} />
                <span className="text-xs text-gray-400">전일 대비</span>
              </div>
              {summary.weeklyChangePercent != null && summary.weeklyChangeAmount != null && (
                <div className="flex items-center gap-2">
                  <ChangeBadge value={summary.weeklyChangeAmount} suffix="원" />
                  <ChangeBadge value={summary.weeklyChangePercent} />
                  <span className="text-xs text-gray-400">1주</span>
                </div>
              )}
            </div>
            {/* 현금/예금 잔액 */}
            <div className="flex items-center justify-between py-2 border-t border-gray-100 mt-2">
              <span className="text-xs text-gray-500">현금/예금</span>
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium text-gray-700 whitespace-nowrap">
                  {formatKRW(cashTotal)}
                </span>
                {cashAccounts.length > 0 && (
                  <span className="text-xs text-gray-400">({cashAccounts.length}개 계좌)</span>
                )}
              </div>
            </div>

            <div className="text-xs text-gray-400">
              {summary.holdingsCount}개 자산
              {lastUpdatedAt && (
                <span className="ml-2">
                  · 업데이트 {lastUpdatedAt.toLocaleTimeString('ko-KR')}
                </span>
              )}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              $1 = ₩{exchangeRate.toLocaleString('ko-KR')}{' '}
              <span className="text-green-500">실시간</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
