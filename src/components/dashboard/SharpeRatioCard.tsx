'use client';

import { useSharpeRatio } from '@/hooks/use-sharpe-ratio';
import { Card, CardContent } from '@/components/ui/Card';

function getGrade(ratio: number): { label: string; color: string } {
  if (ratio >= 1.0) return { label: '우수', color: '#16a34a' };
  if (ratio >= 0.5) return { label: '보통', color: '#6b7280' };
  if (ratio >= 0)   return { label: '개선 필요', color: '#f59e0b' };
  return { label: '무위험 자산 이하', color: '#dc2626' };
}

export function SharpeRatioCard() {
  const { sharpeRatio, isLoading } = useSharpeRatio();

  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-sm font-semibold text-gray-700 mb-2">샤프 지수</p>
        {isLoading ? (
          <p className="text-sm text-gray-400">로딩 중...</p>
        ) : sharpeRatio === null ? (
          <p className="text-sm text-gray-400">3개월 이상의 데이터가 필요합니다</p>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-gray-900">{sharpeRatio.toFixed(2)}</span>
            <span
              className="text-sm font-medium px-2 py-0.5 rounded-full"
              style={{ color: getGrade(sharpeRatio).color, backgroundColor: getGrade(sharpeRatio).color + '1a' }}
            >
              {getGrade(sharpeRatio).label}
            </span>
          </div>
        )}
        <p className="text-xs text-gray-400 mt-1">무위험 수익률 기준: 한국 국채 3년물 3.5%</p>
      </CardContent>
    </Card>
  );
}
