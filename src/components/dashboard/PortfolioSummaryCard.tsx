'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePortfolioSummary } from '@/hooks/use-portfolio-summary';
import { useUpdateCashBalance } from '@/hooks/use-cash';
import { Card, CardContent } from '@/components/ui/Card';
import { ChangeBadge } from '@/components/ui/Badge';
import { formatKRW } from '@/lib/format-currency';
import { Spinner } from '@/components/ui/Spinner';

export function PortfolioSummaryCard() {
  const { summary, cashBalance, isLoading, lastUpdatedAt } = usePortfolioSummary();
  const { mutate: updateCash, isPending: isCashUpdating } = useUpdateCashBalance();
  const queryClient = useQueryClient();

  const [isEditingCash, setIsEditingCash] = useState(false);
  const [editCash, setEditCash] = useState('');

  function handleRefresh() {
    queryClient.invalidateQueries({ queryKey: ['quotes'] });
  }

  function handleCashEdit() {
    setEditCash(String(cashBalance));
    setIsEditingCash(true);
  }

  function handleCashSave() {
    const value = parseFloat(editCash);
    if (isNaN(value) || value < 0) return;
    updateCash(value, { onSuccess: () => setIsEditingCash(false) });
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
                  <span className={`text-sm font-medium ${summary.totalUnrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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

            <div className="flex items-center gap-2 mb-3">
              <ChangeBadge value={summary.totalChange} suffix="원" />
              <ChangeBadge value={summary.totalChangePercent} />
              <span className="text-xs text-gray-400">전일 대비</span>
            </div>
            {/* 현금 잔액 */}
            <div className="flex items-center justify-between py-2 border-t border-gray-100 mt-2">
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500">보유 현금</span>
                {!isEditingCash && (
                  <button
                    onClick={handleCashEdit}
                    className="text-gray-400 hover:text-blue-500 transition-colors"
                    title="현금 잔액 수정"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                )}
              </div>
              {isEditingCash ? (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={editCash}
                    onChange={(e) => setEditCash(e.target.value)}
                    min="0"
                    step="1"
                    autoFocus
                    className="w-32 px-2 py-0.5 border border-blue-300 rounded text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleCashSave}
                    disabled={isCashUpdating}
                    className="text-xs px-2 py-0.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    확인
                  </button>
                  <button
                    onClick={() => setIsEditingCash(false)}
                    className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                  >
                    취소
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  {cashBalance < 0 && (
                    <>
                      <svg className="h-3.5 w-3.5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span className="text-xs text-red-500">(거래 내역 초과)</span>
                    </>
                  )}
                  <span className={`text-xs font-medium ${cashBalance < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                    {formatKRW(cashBalance)}
                  </span>
                </div>
              )}
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
