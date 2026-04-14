'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ExchangeRateModalProps {
  holdings: { currency?: string }[];
  onSaved: () => void;
}

export function ExchangeRateModal({ holdings, onSaved }: ExchangeRateModalProps) {
  const [open, setOpen] = useState(false);
  const [rate, setRate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasUsdHoldings = holdings.some((h) => h.currency === 'USD');

  useEffect(() => {
    if (!hasUsdHoldings) return;

    fetch('/api/settings/exchange-rate')
      .then((res) => res.json())
      .then((data: { exchangeRate: number | null }) => {
        if (data.exchangeRate === null) {
          setOpen(true);
        }
      })
      .catch(() => {
        // 조회 실패 시 모달 표시하지 않음
      });
  }, [hasUsdHoldings]);

  async function handleSave() {
    const parsed = parseFloat(rate);
    if (isNaN(parsed) || parsed <= 0) {
      setError('유효한 환율을 입력해주세요 (0보다 큰 숫자)');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/settings/exchange-rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exchangeRate: parsed }),
      });
      const data = await res.json();
      if (!res.ok) {
        const errData = data as { error?: { message?: string } };
        setError(errData.error?.message ?? '환율 저장에 실패했습니다');
        return;
      }
      setOpen(false);
      onSaved();
    } catch {
      setError('환율 저장에 실패했습니다');
    } finally {
      setIsSaving(false);
    }
  }

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={() => setOpen(false)}
    >
      <div
        className="bg-white rounded-xl shadow-xl p-6 w-80 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h2 className="text-base font-semibold text-gray-900">USD/KRW 환율 설정</h2>
          <p className="mt-1 text-xs text-gray-500">
            미국 주식이 포함되어 있습니다. 원화 환산을 위한 USD/KRW 환율을 입력해주세요.
          </p>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-500">USD/KRW 환율</span>
          <input
            type="number"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="예: 1350"
            min="1"
            step="any"
            autoFocus
          />
        </label>

        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={() => setOpen(false)}
            className="px-4 py-2 text-sm rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            나중에
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isSaving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
