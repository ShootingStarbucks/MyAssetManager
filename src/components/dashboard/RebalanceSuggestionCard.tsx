'use client';

import { useState } from 'react';
import type { RebalanceSuggestion } from '@/types/portfolio.types';

interface RebalanceSuggestionCardProps {
  suggestions: RebalanceSuggestion[];
  onSaveTargets: (targets: { stock: number; crypto: number; cash: number }) => void;
}

const ACTION_CONFIG = {
  BUY:          { label: '매수', color: '#10b981' },
  SELL:         { label: '매도', color: '#ef4444' },
  CASH_ADJUST:  { label: '현금조정', color: '#3b82f6' },
};

export function RebalanceSuggestionCard({ suggestions, onSaveTargets }: RebalanceSuggestionCardProps) {
  const [stock, setStock] = useState(60);
  const [crypto, setCrypto] = useState(20);
  const [cash, setCash] = useState(20);

  const total = stock + crypto + cash;
  const isValid = total === 100;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    onSaveTargets({ stock, crypto, cash });
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">리밸런싱 목표 설정</h3>

      {/* Target allocation form */}
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="flex gap-3 mb-2">
          <label className="flex-1">
            <span className="block text-xs text-gray-500 mb-1">주식 (%)</span>
            <input
              type="number"
              min={0}
              max={100}
              value={stock}
              onChange={(e) => setStock(Number(e.target.value))}
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </label>
          <label className="flex-1">
            <span className="block text-xs text-gray-500 mb-1">암호화폐 (%)</span>
            <input
              type="number"
              min={0}
              max={100}
              value={crypto}
              onChange={(e) => setCrypto(Number(e.target.value))}
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </label>
          <label className="flex-1">
            <span className="block text-xs text-gray-500 mb-1">현금 (%)</span>
            <input
              type="number"
              min={0}
              max={100}
              value={cash}
              onChange={(e) => setCash(Number(e.target.value))}
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </label>
        </div>

        <div className={`text-xs mb-2 font-medium ${isValid ? 'text-green-600' : 'text-red-500'}`}>
          합계: {total}% {!isValid && '(합계가 100%여야 합니다)'}
        </div>

        <button
          type="submit"
          disabled={!isValid}
          className={`w-full py-1.5 rounded text-sm font-medium text-white transition-colors ${
            isValid
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          목표 저장
        </button>
      </form>

      {/* Suggestions list */}
      {suggestions && suggestions.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">리밸런싱 제안</h4>
          <ul className="flex flex-col gap-2">
            {suggestions.map((s, index) => {
              const actionCfg = ACTION_CONFIG[s.action] ?? { label: s.action, color: '#6b7280' };
              return (
                <li key={index} className="flex items-start gap-2 rounded border border-gray-100 p-2 text-xs">
                  <span
                    className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: actionCfg.color }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-gray-700">{s.assetType}</span>
                      <span
                        className="rounded px-1 py-0.5 text-white text-xs font-medium"
                        style={{ backgroundColor: actionCfg.color }}
                      >
                        {actionCfg.label}
                      </span>
                    </div>
                    <div className="text-gray-500">
                      현재 {(s.currentRatio * 100).toFixed(1)}% → 목표 {(s.targetRatio * 100).toFixed(1)}%
                      <span className={s.diffRatio >= 0 ? ' text-green-600' : ' text-red-500'}>
                        {' '}({s.diffRatio >= 0 ? '+' : ''}{(s.diffRatio * 100).toFixed(1)}%)
                      </span>
                    </div>
                    <div className="text-gray-500">
                      금액: {s.amountKRW.toLocaleString('ko-KR')}원
                    </div>
                    <div className="text-gray-600 mt-0.5">{s.message}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
