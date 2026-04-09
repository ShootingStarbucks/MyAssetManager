'use client';

import { useState } from 'react';
import { useAddHolding } from '@/hooks/use-holdings';
import type { AssetType } from '@/types/asset.types';

const ASSET_TYPES: { value: AssetType; label: string; placeholder: string; hint: string }[] = [
  { value: 'us-stock', label: '미국 주식', placeholder: 'AAPL', hint: '예: AAPL, TSLA, NVDA' },
  { value: 'kr-stock', label: '한국 주식', placeholder: '005930', hint: '예: 005930 (삼성전자)' },
  { value: 'crypto', label: '암호화폐', placeholder: 'BTC', hint: '예: BTC, ETH, SOL' },
];

export function AddHoldingForm() {
  const [assetType, setAssetType] = useState<AssetType>('us-stock');
  const [ticker, setTicker] = useState('');
  const [quantity, setQuantity] = useState('');
  const [formError, setFormError] = useState('');

  const { mutate: addHolding, isPending } = useAddHolding();

  const currentType = ASSET_TYPES.find((t) => t.value === assetType)!;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');

    const qty = parseFloat(quantity);
    if (!ticker.trim()) { setFormError('티커를 입력하세요'); return; }
    if (isNaN(qty) || qty <= 0) { setFormError('수량은 0보다 커야 합니다'); return; }

    addHolding(
      { ticker: ticker.trim().toUpperCase(), assetType, quantity: qty },
      {
        onSuccess: () => { setTicker(''); setQuantity(''); },
        onError: (err) => setFormError(err.message),
      }
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 자산 유형 탭 */}
      <div className="flex rounded-lg border border-gray-200 overflow-hidden">
        {ASSET_TYPES.map((type) => (
          <button
            key={type.value}
            type="button"
            onClick={() => { setAssetType(type.value); setTicker(''); setFormError(''); }}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              assetType === type.value
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            placeholder={currentType.placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="mt-1 text-xs text-gray-400">{currentType.hint}</p>
        </div>
        <div className="w-28">
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="수량"
            min="0"
            step="any"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {formError && (
        <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? '추가 중...' : '자산 추가'}
      </button>
    </form>
  );
}
