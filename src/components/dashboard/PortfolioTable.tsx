'use client';

import { usePortfolioSummary } from '@/hooks/use-portfolio-summary';
import { useCashAccounts } from '@/hooks/use-cash';
import { HoldingRow } from './HoldingRow';
import { CashAccountRow } from './CashAccountRow';
import { Spinner } from '@/components/ui/Spinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-100">
      {[1,2,3,4,5,6,7,8].map((i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-200 rounded animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

export function PortfolioTable() {
  const { holdings, exchangeRate, isLoading, isError } = usePortfolioSummary();
  const cashAccounts = useCashAccounts();

  if (isLoading && holdings.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return <ErrorMessage message="가격 정보를 불러오는 중 오류가 발생했습니다" />;
  }

  const hasCashAccounts = (cashAccounts.data?.length ?? 0) > 0;

  if (holdings.length === 0 && !hasCashAccounts) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg font-medium mb-1">보유 자산이 없습니다</p>
        <p className="text-sm">왼쪽 패널에서 자산을 추가해보세요</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[120px]">자산</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[60px]">수량</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[90px]">평단가</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[100px]">현재가</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[80px]">수익률</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[110px]">평가손익</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[110px]">평가액</th>
            <th className="px-2 py-3 min-w-[72px] w-[72px] sticky right-0 bg-white z-10" />
          </tr>
        </thead>
        <tbody>
          {isLoading
            ? Array(3).fill(null).map((_, i) => <SkeletonRow key={i} />)
            : holdings.map((h) => (
                <HoldingRow
                  key={h.id}
                  holding={h}
                  isQuoteLoading={isLoading}
                  exchangeRate={exchangeRate}
                />
              ))}
          {hasCashAccounts && (
            <>
              <tr className="bg-emerald-50">
                <td colSpan={8} className="py-2 px-4 text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                  현금/예금
                </td>
              </tr>
              {cashAccounts.data!.map((account) => (
                <CashAccountRow key={account.id} account={account} />
              ))}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}
