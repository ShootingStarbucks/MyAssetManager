'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useRemoveHolding, useUpdateHolding } from '@/hooks/use-holdings';
import { ChangeBadge, AssetTypeBadge } from '@/components/ui/Badge';
import { formatKRW, formatPrice, formatNumber } from '@/lib/format-currency';
import { toKRW, calculateUnrealizedPnL } from '@/lib/calculate-portfolio';
import { TransactionModal } from './TransactionModal';
import type { HoldingWithQuote } from '@/types/portfolio.types';

interface HoldingRowProps {
  holding: HoldingWithQuote;
  isQuoteLoading: boolean;
}

export function HoldingRow({ holding, isQuoteLoading }: HoldingRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editQty, setEditQty] = useState(String(holding.quantity));
  const [isEditingAvgCost, setIsEditingAvgCost] = useState(false);
  const [editAvgCost, setEditAvgCost] = useState(holding.avgCost != null ? String(holding.avgCost) : '');
  const [showTxModal, setShowTxModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { mutate: remove, isPending: isRemoving } = useRemoveHolding();
  const { mutate: update, isPending: isUpdating } = useUpdateHolding();

  const quote = holding.quote;
  const priceKRW = quote ? toKRW(quote.price, quote.currency) : null;
  const totalValue = priceKRW !== null ? priceKRW * holding.quantity : null;
  const { unrealizedPnL, unrealizedPnLPercent } = calculateUnrealizedPnL(holding);

  function handleUpdateQty() {
    const qty = parseFloat(editQty);
    if (isNaN(qty) || qty <= 0) return;
    update(
      { id: holding.id, quantity: qty },
      { onSuccess: () => setIsEditing(false) }
    );
  }

  function handleUpdateAvgCost() {
    const cost = editAvgCost === '' ? null : parseFloat(editAvgCost);
    if (cost !== null && (isNaN(cost) || cost <= 0)) return;
    update(
      { id: holding.id, avgCost: cost },
      { onSuccess: () => setIsEditingAvgCost(false) }
    );
  }

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900">{holding.ticker}</span>
          <AssetTypeBadge type={holding.assetType} />
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        {isEditing ? (
          <div className="flex items-center justify-end gap-1">
            <input
              type="number"
              value={editQty}
              onChange={(e) => setEditQty(e.target.value)}
              className="w-24 px-2 py-1 border border-blue-300 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
              min="0"
              step="any"
            />
            <button
              onClick={handleUpdateQty}
              disabled={isUpdating}
              className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              확인
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
            >
              취소
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setIsEditing(true); setEditQty(String(holding.quantity)); }}
            className="text-sm text-gray-700 hover:text-blue-600 transition-colors"
            title="클릭하여 수량 수정"
          >
            {formatNumber(holding.quantity)}
          </button>
        )}
      </td>
      {/* 평단가 */}
      <td className="px-4 py-3 text-right">
        {isEditingAvgCost ? (
          <div className="flex items-center justify-end gap-1">
            <input
              type="number"
              value={editAvgCost}
              onChange={(e) => setEditAvgCost(e.target.value)}
              className="w-24 px-2 py-1 border border-blue-300 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
              min="0"
              step="any"
              placeholder={holding.quote?.currency === 'USD' ? 'USD' : '원'}
            />
            <button
              onClick={handleUpdateAvgCost}
              disabled={isUpdating}
              className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              확인
            </button>
            <button
              onClick={() => setIsEditingAvgCost(false)}
              className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
            >
              취소
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setIsEditingAvgCost(true); setEditAvgCost(holding.avgCost != null ? String(holding.avgCost) : ''); }}
            className="text-sm text-gray-700 hover:text-blue-600 transition-colors"
            title="클릭하여 평단가 수정"
          >
            {holding.avgCost != null
              ? formatPrice(holding.avgCost, holding.quote?.currency ?? 'KRW')
              : <span className="text-gray-300">—</span>}
          </button>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        {isQuoteLoading && !quote ? (
          <span className="text-gray-400 text-sm">조회 중...</span>
        ) : quote ? (
          <div>
            <div className="text-sm font-medium text-gray-900">
              {formatPrice(quote.price, quote.currency)}
            </div>
            {quote.currency === 'USD' && priceKRW !== null && (
              <div className="text-xs text-gray-400">{formatKRW(priceKRW)}</div>
            )}
          </div>
        ) : (
          <span className="text-red-400 text-xs">조회 실패</span>
        )}
      </td>
      {/* 수익률 (평균매수단가 기준) */}
      <td className="px-4 py-3 text-right">
        {unrealizedPnLPercent !== null ? (
          <span className={`text-sm font-medium ${unrealizedPnLPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {unrealizedPnLPercent >= 0 ? '+' : ''}{unrealizedPnLPercent.toFixed(2)}%
          </span>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>
      {/* 평가손익 */}
      <td className="px-4 py-3 text-right">
        {unrealizedPnL !== null ? (
          <span className={`text-sm font-medium ${unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {unrealizedPnL >= 0 ? '+' : ''}{formatKRW(unrealizedPnL)}
          </span>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        {totalValue !== null ? (
          <span className="text-sm font-semibold text-gray-900">{formatKRW(totalValue)}</span>
        ) : (
          <span className="text-gray-300 text-sm">-</span>
        )}
      </td>
      <td className="px-4 py-3 text-center">
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setShowTxModal(true)}
            className="text-gray-400 hover:text-blue-500 transition-colors"
            title="거래 내역"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isRemoving}
            className="text-gray-400 hover:text-red-500 disabled:opacity-50 transition-colors"
            title="삭제"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </td>
      {showTxModal && createPortal(
        <TransactionModal holding={holding} onClose={() => setShowTxModal(false)} />,
        document.body
      )}
      {showDeleteConfirm && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl p-6 w-80 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-gray-900">자산 삭제</h2>
            <p className="text-sm text-gray-600">
              <span className="font-bold text-gray-900">{holding.ticker}</span>를(을) 정말 삭제하시겠습니까?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => { remove(holding.id); setShowDeleteConfirm(false); }}
                disabled={isRemoving}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </tr>
  );
}
