'use client';

import { useState } from 'react';
import { useAddHolding } from '@/hooks/use-holdings';
import { useTickerSearch } from '@/hooks/use-ticker-search';
import { Spinner } from '@/components/ui/Spinner';
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
  const [avgCost, setAvgCost] = useState('');
  const [formError, setFormError] = useState('');
  const [tickerError, setTickerError] = useState('');
  const [quantityError, setQuantityError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const { mutate: addHolding, isPending } = useAddHolding();
  const { data: searchResults, isFetching: isSearching } = useTickerSearch(searchQuery, assetType);

  const currentType = ASSET_TYPES.find((t) => t.value === assetType)!;

  function handleAssetTypeChange(type: AssetType) {
    setAssetType(type);
    setTicker('');
    setQuantity('');
    setAvgCost('');
    setSearchQuery('');
    setShowDropdown(false);
    setFormError('');
    setTickerError('');
    setQuantityError('');
  }

  function handleTickerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value.toUpperCase();
    setTicker(v);
    setSearchQuery(v);
    setShowDropdown(true);
    if (v.trim()) setTickerError('');
  }

  function handleQuantityChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setQuantity(v);
    const qty = parseFloat(v);
    if (v && (isNaN(qty) || qty <= 0)) {
      setQuantityError('수량은 0보다 커야 합니다');
    } else {
      setQuantityError('');
    }
  }

  function handleSelectResult(selectedTicker: string) {
    setTicker(selectedTicker);
    setSearchQuery('');
    setShowDropdown(false);
    setFormError('');
    setTickerError('');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');

    const qty = parseFloat(quantity);
    let hasError = false;

    if (!ticker.trim()) {
      setTickerError('티커를 입력하세요');
      hasError = true;
    }
    if (isNaN(qty) || qty <= 0) {
      setQuantityError(!quantity ? '수량을 입력하세요' : '수량은 0보다 커야 합니다');
      hasError = true;
    }
    if (hasError) return;

    const avgCostNum = avgCost ? parseFloat(avgCost) : undefined;
    if (avgCost && (isNaN(avgCostNum!) || avgCostNum! <= 0)) {
      setFormError('평단가는 0보다 커야 합니다');
      return;
    }

    addHolding(
      { ticker: ticker.trim().toUpperCase(), assetType, quantity: qty, avgCost: avgCostNum },
      {
        onSuccess: () => {
          setTicker(''); setQuantity(''); setAvgCost(''); setSearchQuery('');
          setTickerError(''); setQuantityError('');
        },
        onError: (err) => setFormError(err.message),
      }
    );
  }

  const hasDropdown = showDropdown && searchResults && searchResults.length > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 자산 유형 탭 */}
      <div className="flex rounded-lg border border-gray-200 overflow-hidden">
        {ASSET_TYPES.map((type) => (
          <button
            key={type.value}
            type="button"
            onClick={() => handleAssetTypeChange(type.value)}
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
        {/* 티커 입력 + 자동완성 드롭다운 */}
        <div className="relative flex-1">
          <input
            type="text"
            value={ticker}
            onChange={handleTickerChange}
            onFocus={() => { if (ticker) setShowDropdown(true); }}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            placeholder={currentType.placeholder}
            className={`w-full px-3 py-2 pr-8 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent ${
              tickerError
                ? 'border-red-400 focus:ring-red-400'
                : 'border-gray-300 focus:ring-blue-500'
            }`}
          />
          {isSearching && (
            <div className="absolute right-2 top-2.5">
              <Spinner size="sm" />
            </div>
          )}
          {hasDropdown && (
            <ul className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {searchResults.map((r) => (
                <li key={r.ticker}>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); handleSelectResult(r.ticker); }}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm flex items-center gap-2"
                  >
                    <span className="font-medium text-gray-900">{r.ticker}</span>
                    <span className="text-gray-500 text-xs truncate">{r.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {tickerError
            ? <p className="mt-1 text-xs text-red-500">{tickerError}</p>
            : <p className="mt-1 text-xs text-gray-400">{currentType.hint}</p>
          }
        </div>

        <div className="w-28">
          <input
            type="number"
            value={quantity}
            onChange={handleQuantityChange}
            placeholder="수량"
            min="0.000001"
            step="any"
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent ${
              quantityError
                ? 'border-red-400 focus:ring-red-400'
                : 'border-gray-300 focus:ring-blue-500'
            }`}
          />
          {quantityError && (
            <p className="mt-1 text-xs text-red-500 whitespace-nowrap">{quantityError}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="number"
          value={avgCost}
          onChange={(e) => setAvgCost(e.target.value)}
          placeholder={`평단가 (${assetType === 'us-stock' ? 'USD' : '원'}, 선택)`}
          min="0"
          step="any"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {formError && (
        <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? '확인 중...' : '자산 추가'}
      </button>
    </form>
  );
}
