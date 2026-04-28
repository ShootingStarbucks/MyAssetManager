'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useSharpeRatio } from '@/hooks/use-sharpe-ratio';
import { Card, CardContent } from '@/components/ui/Card';

function getGrade(ratio: number): { label: string; color: string } {
  if (ratio >= 1.0) return { label: '우수', color: '#16a34a' };
  if (ratio >= 0.5) return { label: '보통', color: '#6b7280' };
  if (ratio >= 0)   return { label: '개선 필요', color: '#f59e0b' };
  return { label: '무위험 자산 이하', color: '#dc2626' };
}

function SharpeInfoModal({ onClose }: { onClose: () => void }) {
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">샤프 지수란?</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="닫기"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 text-sm text-gray-700">
          <p>
            샤프 지수(Sharpe Ratio)는 <strong>위험 한 단위당 초과 수익률</strong>을 나타내는 지표입니다.
            1966년 노벨 경제학상 수상자 윌리엄 샤프(William Sharpe)가 개발했습니다.
          </p>

          <div className="bg-gray-50 rounded-lg p-3 font-mono text-center text-gray-800">
            샤프 지수 = (포트폴리오 수익률 − 무위험 수익률) ÷ 수익률 표준편차
          </div>

          <div>
            <p className="font-semibold text-gray-800 mb-2">수치 해석</p>
            <ul className="space-y-1.5">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-600 flex-shrink-0" />
                <span><strong className="text-green-700">1.0 이상 — 우수</strong>: 위험 대비 수익이 매우 좋습니다.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gray-500 flex-shrink-0" />
                <span><strong className="text-gray-700">0.5 ~ 1.0 — 보통</strong>: 양호한 수준입니다.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-yellow-500 flex-shrink-0" />
                <span><strong className="text-yellow-700">0 ~ 0.5 — 개선 필요</strong>: 위험에 비해 수익이 낮습니다.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-600 flex-shrink-0" />
                <span><strong className="text-red-700">0 미만 — 무위험 자산 이하</strong>: 무위험 수익률보다 낮은 수익입니다.</span>
              </li>
            </ul>
          </div>

          <p className="text-xs text-gray-400">
            ※ 이 앱에서는 한국 국채 3년물(3.5%)을 무위험 수익률 기준으로 사용하며,
            최근 3개월 이상의 보유 데이터가 있을 때 계산됩니다.
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function SharpeRatioCard() {
  const { sharpeRatio, isLoading } = useSharpeRatio();
  const [showInfo, setShowInfo] = useState(false);

  return (
    <>
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-gray-700">샤프 지수</p>
            <button
              onClick={() => setShowInfo(true)}
              className="w-5 h-5 rounded-full bg-gray-100 border border-gray-300 text-gray-500 hover:bg-gray-200 hover:border-gray-400 hover:text-gray-700 transition-colors flex items-center justify-center text-xs font-bold leading-none"
              aria-label="샤프 지수 설명 보기"
            >
              ?
            </button>
          </div>
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

      {showInfo && <SharpeInfoModal onClose={() => setShowInfo(false)} />}
    </>
  );
}
