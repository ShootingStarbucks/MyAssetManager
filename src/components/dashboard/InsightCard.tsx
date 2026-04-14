'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';

interface InsightDetails {
  portfolioSummary: string;
  riskWarning: string;
  rebalanceSuggestion: string;
  marketAdvice: string;
}

interface Insight {
  id: string;
  summary: string;
  details: InsightDetails;
  isStale: boolean;
  createdAt: string;
}

export function InsightCard() {
  const [insight, setInsight] = useState<Insight | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/insights')
      .then((res) => res.json())
      .then((data) => {
        const raw = data?.insight ?? data;
        if (raw && raw.id) {
          const parsedDetails =
            typeof raw.details === 'string' ? JSON.parse(raw.details) : raw.details;
          setInsight({ ...raw, details: parsedDetails });
        }
      })
      .catch(() => {
        // Silently ignore fetch errors on mount
      });
  }, []);

  async function handleGenerate() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/insights', { method: 'POST' });
      if (res.status === 429) {
        setError('5분 후 다시 시도해주세요.');
        return;
      }
      if (res.status === 400) {
        const body = await res.json();
        setError(body.error ?? '잘못된 요청입니다.');
        return;
      }
      const data = await res.json();
      const raw = data?.insight ?? data;
      const parsedDetails =
        typeof raw.details === 'string' ? JSON.parse(raw.details) : raw.details;
      setInsight({ ...raw, details: parsedDetails });
      setIsExpanded(true);
    } catch {
      setError('인사이트 생성 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-gray-700">AI 인사이트</h2>
      </CardHeader>
      <CardContent>
        {insight === null ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <p className="text-sm text-gray-500">아직 생성된 인사이트가 없습니다.</p>
            <GenerateButton isLoading={isLoading} onClick={handleGenerate} />
          </div>
        ) : (
          <div className="space-y-3">
            {/* Stale badge */}
            {insight.isStale && (
              <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                업데이트 필요
              </span>
            )}

            {/* Summary */}
            <p className="text-sm text-gray-800 leading-relaxed">{insight.summary}</p>

            {/* Created at */}
            <p className="text-xs text-gray-400">
              {new Date(insight.createdAt).toLocaleString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>

            {/* Toggle details */}
            <button
              onClick={() => setIsExpanded((prev) => !prev)}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              {isExpanded ? '▲ 상세 내용 접기' : '▼ 상세 내용 보기'}
            </button>

            {/* Expanded details */}
            {isExpanded && (
              <div className="mt-2 space-y-3 rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
                <DetailSection icon="📊" title="포트폴리오 요약" content={insight.details.portfolioSummary} />
                <DetailSection icon="⚠️" title="리스크 경고" content={insight.details.riskWarning} />
                <DetailSection icon="⚖️" title="리밸런싱 제안" content={insight.details.rebalanceSuggestion} />
                <DetailSection icon="🌍" title="시장 상황 조언" content={insight.details.marketAdvice} />
              </div>
            )}

            {/* Generate / refresh button */}
            <div className="pt-1">
              <GenerateButton isLoading={isLoading} onClick={handleGenerate} />
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <p className="mt-2 text-xs text-red-500">{error}</p>
        )}

        {/* Disclaimer */}
        <p className="mt-4 text-xs text-gray-400">
          본 인사이트는 참고용이며, 투자 결정의 책임은 본인에게 있습니다.
        </p>
      </CardContent>
    </Card>
  );
}

function GenerateButton({ isLoading, onClick }: { isLoading: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${
        isLoading
          ? 'bg-blue-400 cursor-not-allowed'
          : 'bg-blue-600 hover:bg-blue-700'
      }`}
    >
      {isLoading && <Spinner size="sm" />}
      인사이트 생성
    </button>
  );
}

function DetailSection({ icon, title, content }: { icon: string; title: string; content: string }) {
  return (
    <div>
      <p className="mb-1 font-semibold text-gray-700">
        {icon} {title}
      </p>
      <p className="text-gray-600 leading-relaxed whitespace-pre-line">{content}</p>
    </div>
  );
}
