'use client';

import { useState } from 'react';
import { useAddHolding } from '@/hooks/use-holdings';
import { useTickerSearch } from '@/hooks/use-ticker-search';
import { useAddCashAccount } from '@/hooks/use-cash';
import { Spinner } from '@/components/ui/Spinner';
import type { AssetType } from '@/types/asset.types';

const ASSET_TYPES: { value: AssetType; label: string; placeholder: string; hint: string }[] = [
  { value: 'us-stock', label: '미국 주식', placeholder: 'AAPL', hint: '예: AAPL, TSLA, NVDA' },
  { value: 'kr-stock', label: '한국 주식', placeholder: '삼성전자 또는 005930', hint: '예: 삼성전자, 005930' },
  { value: 'crypto', label: '암호화폐', placeholder: 'BTC', hint: '예: BTC, ETH, SOL' },
];

const EXCHANGE_OPTIONS: Record<string, string[]> = {
  'us-stock': ['NASDAQ', 'NYSE', '기타'],
  'kr-stock': ['KOSPI', 'KOSDAQ', '기타'],
  'crypto': ['Upbit', 'Bithumb', 'Binance', '기타'],
};

const CASH_ACCOUNT_TYPES = ['입출금', '정기예금', 'CMA', '적금', '기타'] as const;
type CashAccountType = (typeof CASH_ACCOUNT_TYPES)[number];

function deriveCurrency(exchange: string | undefined, assetType: string): 'KRW' | 'USD' | undefined {
  if (!exchange) return assetType === 'us-stock' ? 'USD' : 'KRW';
  if (['KOSPI', 'KOSDAQ', 'Upbit', 'Bithumb'].includes(exchange)) return 'KRW';
  if (['NASDAQ', 'NYSE', 'Binance'].includes(exchange)) return 'USD';
  return assetType === 'us-stock' ? 'USD' : 'KRW';
}

type TabType = AssetType | 'cash';

export function AddHoldingForm() {
  const [activeTab, setActiveTab] = useState<TabType>('us-stock');

  // Stock/crypto fields
  const [ticker, setTicker] = useState('');
  const [quantity, setQuantity] = useState('');
  const [avgCost, setAvgCost] = useState('');
  const [formError, setFormError] = useState('');
  const [tickerError, setTickerError] = useState('');
  const [quantityError, setQuantityError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showExtra, setShowExtra] = useState(false);
  const [exchange, setExchange] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [memo, setMemo] = useState('');

  // Cash fields
  const [institution, setInstitution] = useState('');
  const [accountType, setAccountType] = useState<CashAccountType>('입출금');
  const [amount, setAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [maturityDate, setMaturityDate] = useState('');
  const [cashMemo, setCashMemo] = useState('');
  const [cashError, setCashError] = useState('');

  const assetType = activeTab !== 'cash' ? (activeTab as AssetType) : 'us-stock';
  const { mutate: addHolding, isPending } = useAddHolding();
  const { data: searchResults, isFetching: isSearching } = useTickerSearch(searchQuery, assetType);
  const { mutate: addCashAccount, isPending: isCashPending } = useAddCashAccount();

  const currentType = ASSET_TYPES.find((t) => t.value === activeTab) ?? ASSET_TYPES[0];

  function resetStockForm() {
    setTicker(''); setQuantity(''); setAvgCost(''); setSearchQuery('');
    setTickerError(''); setQuantityError(''); setFormError('');
    setExchange(''); setPurchaseDate(''); setMemo(''); setShowExtra(false);
    setShowDropdown(false);
  }

  function resetCashForm() {
    setInstitution(''); setAccountType('입출금'); setAmount('');
    setInterestRate(''); setMaturityDate(''); setCashMemo(''); setCashError('');
  }

  function handleTabChange(tab: TabType) {
    setActiveTab(tab);
    resetStockForm();
    resetCashForm();
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

  function handleSubmitStock(e: React.FormEvent) {
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

    const currency = deriveCurrency(exchange || undefined, activeTab as AssetType);

    addHolding(
      {
        ticker: ticker.trim().toUpperCase(),
        assetType: activeTab as AssetType,
        quantity: qty,
        avgCost: avgCostNum,
        exchange: exchange || undefined,
        currency,
        purchaseDate: purchaseDate || undefined,
        memo: memo || undefined,
      },
      {
        onSuccess: resetStockForm,
        onError: (err) => setFormError(err.message),
      }
    );
  }

  function handleSubmitCash(e: React.FormEvent) {
    e.preventDefault();
    setCashError('');

    if (!institution.trim()) { setCashError('금융기관명을 입력하세요'); return; }
    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) { setCashError('금액을 입력하세요'); return; }

    const showInterest = accountType === '정기예금' || accountType === '적금';
    const interestRateNum = showInterest && interestRate ? parseFloat(interestRate) : undefined;

    addCashAccount(
      {
        institution: institution.trim(),
        accountType,
        amount: amountNum,
        interestRate: interestRateNum,
        maturityDate: showInterest && maturityDate ? maturityDate : undefined,
        memo: cashMemo || undefined,
      },
      {
        onSuccess: resetCashForm,
        onError: (err) => setCashError(err.message),
      }
    );
  }

  const hasDropdown = showDropdown && searchResults && searchResults.length > 0;
  const showInterestFields = accountType === '정기예금' || accountType === '적금';
  const exchangeOptions = activeTab !== 'cash' ? EXCHANGE_OPTIONS[activeTab as AssetType] : [];

  return (
    <div className="space-y-4">
      {/* 탭 */}
      <div className="flex rounded-lg border border-gray-200 overflow-hidden">
        {ASSET_TYPES.map((type) => (
          <button
            key={type.value}
            type="button"
            onClick={() => handleTabChange(type.value)}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              activeTab === type.value
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {type.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => handleTabChange('cash')}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            activeTab === 'cash'
              ? 'bg-emerald-600 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          현금/예금
        </button>
      </div>

      {/* 주식/암호화폐 폼 */}
      {activeTab !== 'cash' && (
        <form onSubmit={handleSubmitStock} className="space-y-4">
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
              placeholder={`평단가 (${activeTab === 'us-stock' ? 'USD' : '원'}, 선택)`}
              min="0"
              step="any"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 추가 정보 토글 */}
          <button
            type="button"
            onClick={() => setShowExtra((v) => !v)}
            className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <span>{showExtra ? '▲' : '▼'}</span>
            <span>추가 정보 (선택)</span>
          </button>

          {showExtra && (
            <div className="space-y-3 border border-gray-100 rounded-lg p-3 bg-gray-50">
              <div>
                <label className="block text-xs text-gray-500 mb-1">거래소</label>
                <select
                  value={exchange}
                  onChange={(e) => setExchange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">선택 안함</option>
                  {exchangeOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">매수일</label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">메모</label>
                <input
                  type="text"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="메모 (선택)"
                  maxLength={500}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

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
      )}

      {/* 현금/예금 폼 */}
      {activeTab === 'cash' && (
        <form onSubmit={handleSubmitCash} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">금융기관</label>
            <input
              type="text"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder="예: 국민은행, 카카오뱅크"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">계좌 유형</label>
            <select
              value={accountType}
              onChange={(e) => setAccountType(e.target.value as CashAccountType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {CASH_ACCOUNT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">금액 (원)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="금액"
              min="0"
              step="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {showInterestFields && (
            <>
              <div>
                <label className="block text-xs text-gray-500 mb-1">이자율 (%)</label>
                <input
                  type="number"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  placeholder="예: 3.5"
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">만기일</label>
                <input
                  type="date"
                  value={maturityDate}
                  onChange={(e) => setMaturityDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs text-gray-500 mb-1">메모 (선택)</label>
            <input
              type="text"
              value={cashMemo}
              onChange={(e) => setCashMemo(e.target.value)}
              placeholder="메모"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {cashError && (
            <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{cashError}</p>
          )}

          <button
            type="submit"
            disabled={isCashPending}
            className="w-full py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isCashPending ? '추가 중...' : '현금/예금 추가'}
          </button>
        </form>
      )}
    </div>
  );
}
