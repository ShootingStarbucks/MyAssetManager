'use client';

import { usePortfolioSummary } from '@/hooks/use-portfolio-summary';
import { HoldingRow } from './HoldingRow';
import { Spinner } from '@/components/ui/Spinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-100">
      {[1,2,3,4,5,6].map((i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-200 rounded animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

export function PortfolioTable() {
  const { holdings, isLoading, isError } = usePortfolioSummary();

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

  if (holdings.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg font-medium mb-1">보유 자산이 없습니다</p>
        <p className="text-sm">왼쪽 패널에서 자산을 추가해보세요</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">자산</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">수량</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">현재가</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">등락률</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">평가액</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {isLoading
            ? Array(3).fill(null).map((_, i) => <SkeletonRow key={i} />)
            : holdings.map((h) => (
                <HoldingRow key={h.id} holding={h} isQuoteLoading={isLoading} />
              ))}
        </tbody>
      </table>
    </div>
  );
}
