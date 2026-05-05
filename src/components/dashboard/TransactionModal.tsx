'use client';

import { useState, useEffect, useRef } from 'react';
import { useTransactions, useAddTransaction, useRemoveTransaction } from '@/hooks/use-transactions';
import { formatPrice, formatNumber } from '@/lib/format-currency';
import { getKrStockKoreanName } from '@/lib/kr-stock-names';
import { getKrEtfName } from '@/lib/kr-etf-names';
import { Spinner } from '@/components/ui/Spinner';
import type { HoldingWithQuote } from '@/types/portfolio.types';

interface TransactionModalProps {
  holding: HoldingWithQuote;
  onClose: () => void;
}

const currency = (assetType: string): 'KRW' | 'USD' =>
  assetType === 'us-stock' ? 'USD' : 'KRW';

export function TransactionModal({ holding, onClose }: TransactionModalProps) {
  const { data: transactions = [], isLoading } = useTransactions(holding.id);
  const { mutate: addTx, isPending: isAdding, error: addError } = useAddTransaction();
  const { mutate: removeTx, isPending: isRemoving } = useRemoveTransaction();

  const [type, setType] = useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [fee, setFee] = useState('');
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [note, setNote] = useState('');

  const overlayRef = useRef<HTMLDivElement>(null);

  // ESC 닫기
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const qty = parseFloat(quantity);
    const pr = parseFloat(price);
    if (isNaN(qty) || qty <= 0 || isNaN(pr) || pr <= 0) return;

    addTx(
      {
        holdingId: holding.id,
        type,
        quantity: qty,
        price: pr,
        fee: fee ? parseFloat(fee) : undefined,
        date: new Date(date).toISOString(),
        note: note || undefined,
      },
      {
        onSuccess: () => {
          setQuantity('');
          setPrice('');
          setFee('');
          setNote('');
        },
      }
    );
  }

  const cur = currency(holding.assetType);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col mx-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
            {holding.assetType === 'kr-stock'
              ? (getKrStockKoreanName(holding.ticker) ?? holding.name ?? holding.ticker)
              : holding.assetType === 'kr-etf'
              ? (getKrEtfName(holding.ticker) ?? holding.name ?? holding.ticker)
              : (holding.name ?? holding.ticker)}{' '}
            거래 내역
          </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              현재 보유: {formatNumber(holding.quantity)}주
              {holding.avgCost != null && ` · 평단가 ${formatPrice(holding.avgCost, cur)}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="닫기"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-0 overflow-hidden flex-1">
          {/* 거래 추가 폼 */}
          <form onSubmit={handleSubmit} className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">거래 추가</p>
            <div className="flex flex-wrap gap-2 items-end">
              {/* 매수/매도 토글 */}
              <div className="flex rounded-lg overflow-hidden border border-gray-200 text-sm">
                <button
                  type="button"
                  onClick={() => setType('BUY')}
                  className={`px-3 py-1.5 font-medium transition-colors ${type === 'BUY' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  매수
                </button>
                <button
                  type="button"
                  onClick={() => setType('SELL')}
                  className={`px-3 py-1.5 font-medium transition-colors ${type === 'SELL' ? 'bg-red-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  매도
                </button>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">수량</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="수량"
                  min="0"
                  step="any"
                  required
                  className="w-28 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">단가 ({cur})</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="거래 단가"
                  min="0"
                  step="any"
                  required
                  className="w-32 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">수수료 (선택)</label>
                <input
                  type="number"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  placeholder="0"
                  min="0"
                  step="any"
                  className="w-24 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">거래일</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  max={today}
                  required
                  className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">메모 (선택)</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="메모"
                  maxLength={200}
                  className="w-28 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              <button
                type="submit"
                disabled={isAdding}
                className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isAdding ? '추가 중...' : '추가'}
              </button>
            </div>
            {addError && (
              <p className="text-xs text-red-500 mt-2">{(addError as Error).message}</p>
            )}
          </form>

          {/* 거래 내역 목록 */}
          <div className="overflow-y-auto flex-1 px-6 py-4">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Spinner size="md" />
              </div>
            ) : transactions.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">거래 내역이 없습니다</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="py-2 text-left text-xs font-semibold text-gray-400 uppercase">구분</th>
                    <th className="py-2 text-right text-xs font-semibold text-gray-400 uppercase">수량</th>
                    <th className="py-2 text-right text-xs font-semibold text-gray-400 uppercase">단가</th>
                    <th className="py-2 text-right text-xs font-semibold text-gray-400 uppercase">금액</th>
                    <th className="py-2 text-right text-xs font-semibold text-gray-400 uppercase">수수료</th>
                    <th className="py-2 text-left text-xs font-semibold text-gray-400 uppercase">거래일</th>
                    <th className="py-2 text-left text-xs font-semibold text-gray-400 uppercase">메모</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-2.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          tx.type === 'BUY'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-red-50 text-red-600'
                        }`}>
                          {tx.type === 'BUY' ? '매수' : '매도'}
                        </span>
                      </td>
                      <td className="py-2.5 text-right text-gray-700">{formatNumber(tx.quantity)}</td>
                      <td className="py-2.5 text-right text-gray-700">{formatPrice(tx.price, cur)}</td>
                      <td className="py-2.5 text-right text-gray-700 font-medium">
                        {formatPrice(tx.quantity * tx.price, cur)}
                      </td>
                      <td className="py-2.5 text-right text-gray-400 text-xs">
                        {tx.fee != null ? formatPrice(tx.fee, cur) : '—'}
                      </td>
                      <td className="py-2.5 text-gray-500 text-xs">
                        {new Date(tx.date).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="py-2.5 text-gray-400 text-xs max-w-[100px] truncate">
                        {tx.note ?? ''}
                      </td>
                      <td className="py-2.5 text-right">
                        <button
                          onClick={() => removeTx({ id: tx.id, holdingId: tx.holdingId })}
                          disabled={isRemoving}
                          className="text-gray-300 hover:text-red-400 disabled:opacity-50 transition-colors"
                          title="삭제"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
