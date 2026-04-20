'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Spinner } from '@/components/ui/Spinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { AssetChangeSummaryCard } from '@/components/report/AssetChangeSummaryCard';
import { AssetClassPerformanceChart } from '@/components/report/AssetClassPerformanceChart';
import { BestWorstCard } from '@/components/report/BestWorstCard';
import { RiskChangeBadge } from '@/components/report/RiskChangeBadge';
import { NextMonthActionCard } from '@/components/report/NextMonthActionCard';

type MonthlyReport = {
  totalAssetStart: number;
  totalAssetEnd: number;
  totalChange: number;
  totalChangePercent: number;
  byAssetClass: { stock: number; crypto: number; cash: number };
  best: { ticker: string; returnPercent: number } | null;
  worst: { ticker: string; returnPercent: number } | null;
  riskProfile: { current: string; previous: string };
  rebalanceNeeded: boolean;
  upcomingMaturities: { institution: string; maturityDate: string; amount: number }[];
};

type ApiError = { error: string };

const NO_DATA_MESSAGE = '이달 데이터가 아직 없습니다';

function getPrevMonth(year: number, month: number): { year: number; month: number } {
  if (month === 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}

function getNextMonth(year: number, month: number): { year: number; month: number } {
  if (month === 12) return { year: year + 1, month: 1 };
  return { year, month: month + 1 };
}

export function MonthlyReportPage() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);

  const isAtCurrentMonth = year === currentYear && month === currentMonth;

  const { data, isLoading, error } = useQuery<MonthlyReport, ApiError>({
    queryKey: ['report', 'monthly', year, month],
    queryFn: () =>
      fetch(`/api/report/monthly?year=${year}&month=${month}`).then(async (res) => {
        if (!res.ok) throw await res.json();
        return res.json();
      }),
  });

  const handlePrev = () => {
    const prev = getPrevMonth(year, month);
    setYear(prev.year);
    setMonth(prev.month);
  };

  const handleNext = () => {
    const next = getNextMonth(year, month);
    setYear(next.year);
    setMonth(next.month);
  };

  const noDataError =
    error && typeof error === 'object' && 'error' in error && error.error === NO_DATA_MESSAGE;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          월간 리포트 &mdash; {year}년 {month}월
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            ◀ 이전 달
          </button>
          <button
            onClick={handleNext}
            disabled={isAtCurrentMonth}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            다음 달 ▶
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      )}

      {!isLoading && noDataError && (
        <div className="flex justify-center py-16">
          <div className="bg-white border border-gray-200 rounded-xl px-8 py-10 text-center shadow-sm max-w-sm">
            <p className="text-gray-500 text-sm">{NO_DATA_MESSAGE}</p>
          </div>
        </div>
      )}

      {!isLoading && error && !noDataError && (
        <ErrorMessage
          message={
            typeof error === 'object' && 'error' in error
              ? (error as ApiError).error
              : '리포트를 불러오는 중 오류가 발생했습니다.'
          }
        />
      )}

      {!isLoading && data && (
        <div className="space-y-6">
          <AssetChangeSummaryCard
            data={{
              totalAssetStart: data.totalAssetStart,
              totalAssetEnd: data.totalAssetEnd,
              totalChange: data.totalChange,
              totalChangePercent: data.totalChangePercent,
            }}
          />
          <AssetClassPerformanceChart data={{ byAssetClass: data.byAssetClass }} />
          <BestWorstCard best={data.best} worst={data.worst} />
          <RiskChangeBadge riskProfile={data.riskProfile} />
          <NextMonthActionCard
            rebalanceNeeded={data.rebalanceNeeded}
            upcomingMaturities={data.upcomingMaturities}
          />
        </div>
      )}
    </div>
  );
}
