'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { History, Info, Pencil, Trash2 } from 'lucide-react';
import { useRemoveHolding, useUpdateHolding } from '@/hooks/use-holdings';
import { AssetTypeBadge, ManualPriceBadge } from '@/components/ui/Badge';
import { formatKRW, formatPrice, formatNumber } from '@/lib/format-currency';
import { toKRW, calculateUnrealizedPnL } from '@/lib/calculate-portfolio';
import { getKrStockKoreanName } from '@/lib/kr-stock-names';
import { TransactionModal } from './TransactionModal';
import { StockDetailModal } from './StockDetailModal';
import type { HoldingWithQuote } from '@/types/portfolio.types';

interface HoldingRowProps {
  holding: HoldingWithQuote;
  isQuoteLoading: boolean;
  exchangeRate?: number;
}

export function HoldingRow({ holding, isQuoteLoading, exchangeRate = 1380 }: HoldingRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editQty, setEditQty] = useState(String(holding.quantity));
  const [isEditingAvgCost, setIsEditingAvgCost] = useState(false);
  const [editAvgCost, setEditAvgCost] = useState(holding.avgCost != null ? String(holding.avgCost) : '');
  const [showTxModal, setShowTxModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [modalQty, setModalQty] = useState('');
  const [modalAvgCost, setModalAvgCost] = useState('');
  const [isEditingManualPrice, setIsEditingManualPrice] = useState(false);
  const [editManualPrice, setEditManualPrice] = useState(holding.currentPrice != null ? String(holding.currentPrice) : '');

  const { mutate: remove, isPending: isRemoving } = useRemoveHolding();
  const { mutate: update, isPending: isUpdating } = useUpdateHolding();

  const quote = holding.quote;
  const priceKRW = quote
    ? toKRW(quote.price, quote.currency, exchangeRate)
    : holding.avgCost != null ? toKRW(holding.avgCost, holding.currency, exchangeRate) : null;
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

  function handleUpdateManualPrice() {
    const price = editManualPrice === '' ? null : parseFloat(editManualPrice);
    if (price !== null && (isNaN(price) || price <= 0)) return;
    update(
      { id: holding.id, currentPrice: price },
      { onSuccess: () => setIsEditingManualPrice(false) }
    );
  }

  function openEditModal() {
    setModalQty(String(holding.quantity));
    setModalAvgCost(holding.avgCost != null ? String(holding.avgCost) : '');
    setShowEditModal(true);
  }

  function handleEditSave() {
    const qty = parseFloat(modalQty);
    if (isNaN(qty) || qty <= 0) return;
    const cost = modalAvgCost === '' ? null : parseFloat(modalAvgCost);
    if (cost !== null && (isNaN(cost) || cost <= 0)) return;
    update(
      { id: holding.id, quantity: qty, avgCost: cost },
      { onSuccess: () => setShowEditModal(false) }
    );
  }

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors group">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex flex-col cursor-pointer group/name" onClick={() => setShowDetailModal(true)}>
            {holding.assetType === 'kr-stock' ? (
              <>
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-gray-900 group-hover/name:text-blue-600 group-hover/name:underline transition-colors">
                    {getKrStockKoreanName(holding.ticker) || holding.name || quote?.name || holding.ticker}
                  </span>
                  <Info className="w-3 h-3 text-blue-500 opacity-0 group-hover/name:opacity-100 transition-opacity" />
                </div>
                <span className="text-xs text-gray-400 group-hover/name:text-blue-400 transition-colors">{holding.ticker}</span>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-gray-900 group-hover/name:text-blue-600 group-hover/name:underline transition-colors">{holding.ticker}</span>
                  <Info className="w-3 h-3 text-blue-500 opacity-0 group-hover/name:opacity-100 transition-opacity" />
                </div>
                {quote?.name && (
                  <span className="text-xs text-gray-400">{quote.name}</span>
                )}
              </>
            )}
          </div>
          <AssetTypeBadge type={holding.assetType} />
          {!quote && <ManualPriceBadge />}
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
          <div className="flex flex-col items-end gap-1">
            {!isEditingManualPrice && (
              <button
                onClick={() => { setIsEditingManualPrice(true); setEditManualPrice(holding.currentPrice != null ? String(holding.currentPrice) : ''); }}
                className="flex items-center gap-1"
                title="현재가 직접 입력"
              >
                {holding.currentPrice != null ? (
                  <span className="text-sm text-gray-700 hover:text-blue-600 transition-colors">
                    {formatPrice(holding.currentPrice, holding.currency ?? 'KRW')}
                  </span>
                ) : (
                  <ManualPriceBadge />
                )}
              </button>
            )}
            {isEditingManualPrice && (
              <div className="flex items-center justify-end gap-1">
                <input
                  type="number"
                  value={editManualPrice}
                  onChange={(e) => setEditManualPrice(e.target.value)}
                  className="w-24 px-2 py-1 border border-yellow-300 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-yellow-500"
                  min="0"
                  step="any"
                  placeholder={holding.currency === 'USD' ? 'USD' : '원'}
                  autoFocus
                />
                <button
                  onClick={handleUpdateManualPrice}
                  disabled={isUpdating}
                  className="text-xs px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
                >
                  확인
                </button>
                <button
                  onClick={() => setIsEditingManualPrice(false)}
                  className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                >
                  취소
                </button>
              </div>
            )}
          </div>
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
      <td className="px-4 py-3 text-center sticky right-0 bg-white group-hover:bg-gray-50 transition-colors">
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setShowTxModal(true)}
            className="text-gray-400 hover:text-blue-500 transition-colors"
            title="거래 내역"
            aria-label="거래 내역"
          >
            <History className="h-4 w-4" />
          </button>
          <button
            onClick={openEditModal}
            className="text-gray-400 hover:text-amber-500 transition-colors"
            title="편집"
            aria-label="편집"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isRemoving}
            className="text-gray-400 hover:text-red-500 disabled:opacity-50 transition-colors"
            title="삭제"
            aria-label="삭제"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
      {showTxModal && createPortal(
        <TransactionModal holding={holding} onClose={() => setShowTxModal(false)} />,
        document.body
      )}
      {showEditModal && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowEditModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl p-6 w-80 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-gray-900">
              자산 편집 — <span className="text-blue-600">{holding.ticker}</span>
            </h2>
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-gray-500">수량</span>
                <input
                  type="number"
                  value={modalQty}
                  onChange={(e) => setModalQty(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  step="any"
                  placeholder="수량 입력"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-gray-500">
                  평단가 ({holding.quote?.currency === 'USD' ? 'USD' : '원'})
                </span>
                <input
                  type="number"
                  value={modalAvgCost}
                  onChange={(e) => setModalAvgCost(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  step="any"
                  placeholder="평단가 입력 (선택)"
                />
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-sm rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleEditSave}
                disabled={isUpdating}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isUpdating ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>,
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
      {showDetailModal && createPortal(
        <StockDetailModal
          holding={holding}
          exchangeRate={exchangeRate}
          onClose={() => setShowDetailModal(false)}
        />,
        document.body
      )}
    </tr>
  );
}
