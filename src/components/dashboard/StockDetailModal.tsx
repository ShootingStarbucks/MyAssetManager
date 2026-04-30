'use client';

import { createPortal } from 'react-dom';
import type { HoldingWithQuote } from '@/types/portfolio.types';
import { formatKRW, formatPrice } from '@/lib/format-currency';
import { toKRW, calculateUnrealizedPnL } from '@/lib/calculate-portfolio';
import { getKrStockKoreanName } from '@/lib/kr-stock-names';
import { AssetTypeBadge } from '@/components/ui/Badge';
import { useStockDetail } from '@/hooks/use-stock-detail';

interface StockDetailModalProps {
  holding: HoldingWithQuote;
  exchangeRate?: number;
  onClose: () => void;
}

export function StockDetailModal({ holding, exchangeRate, onClose }: StockDetailModalProps) {
  const { data, isLoading, isError, error } = useStockDetail(holding.id);
  const { unrealizedPnL, unrealizedPnLPercent } = calculateUnrealizedPnL(holding);

  const isKrStock = holding.assetType === 'kr-stock';
  const displayName = isKrStock
    ? (getKrStockKoreanName(holding.ticker) || holding.name || holding.ticker)
    : holding.ticker;
  const showTicker = displayName !== holding.ticker;

  const currency = holding.quote?.currency ?? 'KRW';
  const effectiveRate = exchangeRate ?? 1380;

  const priceKRW = holding.quote
    ? toKRW(holding.quote.price, holding.quote.currency, effectiveRate) * holding.quantity
    : null;

  const changePercent = holding.quote?.changePercent ?? null;

  const sentimentConfig = {
    positive: { label: '호재', className: 'bg-green-100 text-green-700' },
    negative: { label: '악재', className: 'bg-red-100 text-red-700' },
    neutral: { label: '중립', className: 'bg-gray-100 text-gray-600' },
  };

  const scorePercent =
    data?.score != null ? Math.round(((data.score + 1) / 2) * 100) : null;

  const scoreBarColor =
    data?.score != null
      ? data.score > 0.2
        ? 'bg-green-500'
        : data.score < -0.2
        ? 'bg-red-500'
        : 'bg-gray-400'
      : 'bg-gray-400';

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Section 1: Header */}
        <div className="flex justify-between items-start p-5">
          <div className="flex items-start gap-2">
            <div>
              <span className="text-lg font-semibold text-gray-900">{displayName}</span>
              {showTicker && (
                <p className="text-xs text-gray-400 mt-0.5">{holding.ticker}</p>
              )}
            </div>
            <AssetTypeBadge type={holding.assetType} />
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors ml-2 mt-0.5"
            aria-label="닫기"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Section 2: 종목 기본 정보 */}
        <div className="border-t border-gray-100 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            종목 기본 정보
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">현재가</p>
              <p className="text-sm font-medium text-gray-900">
                {holding.quote != null
                  ? formatPrice(holding.quote.price, currency as 'KRW' | 'USD')
                  : '—'}
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">등락률</p>
              {changePercent != null ? (
                <p className={`text-sm font-medium ${changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%
                </p>
              ) : (
                <p className="text-sm font-medium text-gray-900">—</p>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">평균매수가</p>
              <p className="text-sm font-medium text-gray-900">
                {holding.avgCost != null
                  ? formatPrice(holding.avgCost, currency as 'KRW' | 'USD')
                  : '—'}
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">수익률</p>
              {unrealizedPnLPercent != null ? (
                <p className={`text-sm font-medium ${unrealizedPnLPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {unrealizedPnLPercent >= 0 ? '+' : ''}{unrealizedPnLPercent.toFixed(2)}%
                </p>
              ) : (
                <p className="text-sm font-medium text-gray-900">—</p>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">평가금액</p>
              <p className="text-sm font-medium text-gray-900 whitespace-nowrap">
                {priceKRW != null ? formatKRW(priceKRW) : '—'}
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">수익금</p>
              {unrealizedPnL != null ? (
                <p className={`text-sm font-medium whitespace-nowrap ${unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {unrealizedPnL >= 0 ? '+' : ''}{formatKRW(unrealizedPnL)}
                </p>
              ) : (
                <p className="text-sm font-medium text-gray-900">—</p>
              )}
            </div>
          </div>
        </div>

        {/* Section 3: 뉴스 감성 분석 */}
        <div className="border-t border-gray-100 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            뉴스 감성 분석
          </p>

          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="animate-spin border-2 border-blue-500 border-t-transparent rounded-full w-5 h-5" />
              뉴스 분석 중...
            </div>
          )}

          {!isLoading && (isError || data?.error) && (
            <p className="text-sm text-gray-400">
              {isError && error instanceof Error ? error.message : '분석 정보를 불러올 수 없습니다.'}
            </p>
          )}

          {!isLoading && !isError && data && !data.error && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {data.sentiment != null ? (
                  <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold ${sentimentConfig[data.sentiment].className}`}>
                    {sentimentConfig[data.sentiment].label}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-500">
                    분석 불가
                  </span>
                )}
              </div>

              {scorePercent != null && (
                <div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${scoreBarColor}`}
                      style={{ width: `${scorePercent}%` }}
                    />
                  </div>
                </div>
              )}

              {data.summary && (
                <p className="text-sm text-gray-500">{data.summary}</p>
              )}

              {data.keyReasons.length > 0 && (
                <ul className="list-disc list-inside space-y-1">
                  {data.keyReasons.map((reason, i) => (
                    <li key={i} className="text-sm text-gray-700">{reason}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Section 4: 관련 뉴스 */}
        <div className="border-t border-gray-100 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            관련 뉴스
          </p>

          {!data?.newsItems || data.newsItems.length === 0 ? (
            <p className="text-sm text-gray-400">관련 뉴스가 없습니다.</p>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-0">
              {data.newsItems.map((item, i) => {
                const date = new Date(item.pubDate);
                const formatted = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
                const truncated = item.description.length > 100
                  ? item.description.slice(0, 100) + '...'
                  : item.description;
                const isLast = i === data.newsItems.length - 1;

                return (
                  <div key={i} className={!isLast ? 'border-b border-gray-100 pb-3 mb-3' : ''}>
                    <p className="text-xs text-gray-400 mb-0.5">{formatted}</p>
                    <p className="font-medium text-sm text-gray-900 mb-1">{item.title}</p>
                    {truncated && (
                      <p className="text-sm text-gray-500 mb-1">{truncated}</p>
                    )}
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:text-blue-700"
                    >
                      원본 보기 →
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modal, document.body);
}
