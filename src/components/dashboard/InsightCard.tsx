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
  const [copyablePrompt, setCopyablePrompt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteError, setPasteError] = useState<string | null>(null);

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
    setCopyablePrompt(null);
    setCopied(false);
    try {
      const res = await fetch('/api/insights', { method: 'POST' });
      if (res.status === 429) {
        const body = await res.json().catch(() => ({}));
        const errBody = body as { error?: string };
        setError(errBody.error ?? '5분 후 다시 시도해주세요.');
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? '인사이트 생성에 실패했습니다.');
        if (body.prompt) setCopyablePrompt(body.prompt);
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

  function handleApplyPastedJson() {
    setPasteError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(pasteText);
    } catch {
      setPasteError('유효한 JSON 형식이 아닙니다.');
      return;
    }
    const obj = parsed as Record<string, unknown>;
    if (
      typeof obj.summary !== 'string' ||
      typeof obj.details !== 'object' ||
      obj.details === null
    ) {
      setPasteError('summary와 details 필드가 필요합니다.');
      return;
    }
    const details = obj.details as Record<string, unknown>;
    if (
      typeof details.portfolioSummary !== 'string' ||
      typeof details.riskWarning !== 'string' ||
      typeof details.rebalanceSuggestion !== 'string' ||
      typeof details.marketAdvice !== 'string'
    ) {
      setPasteError('details에 portfolioSummary, riskWarning, rebalanceSuggestion, marketAdvice 필드가 필요합니다.');
      return;
    }
    const manualInsight: Insight = {
      id: `manual-${Date.now()}`,
      summary: obj.summary,
      details: details as unknown as InsightDetails,
      isStale: false,
      createdAt: new Date().toISOString(),
    };
    setInsight(manualInsight);
    setIsExpanded(true);
    setError(null);
    setCopyablePrompt(null);
    setShowPasteModal(false);
    setPasteText('');
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
          <div className="mt-2 space-y-2">
            <p className="text-xs text-red-500">{error}</p>
            {copyablePrompt && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    const write = (text: string) => {
                      if (navigator.clipboard) {
                        return navigator.clipboard.writeText(text);
                      }
                      const el = document.createElement('textarea');
                      el.value = text;
                      el.style.cssText = 'position:fixed;opacity:0';
                      document.body.appendChild(el);
                      el.focus();
                      el.select();
                      document.execCommand('copy');
                      document.body.removeChild(el);
                      return Promise.resolve();
                    };
                    write(copyablePrompt!).then(() => {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    });
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {copied ? '복사됨 ✓' : '프롬프트 복사'}
                </button>
                <button
                  onClick={() => { setShowPasteModal(true); setPasteError(null); setPasteText(''); }}
                  className="inline-flex items-center gap-1.5 rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  JSON 결과 붙여넣기
                </button>
              </div>
            )}
          </div>
        )}

        {/* Paste JSON Modal */}
        {showPasteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl mx-4">
              <h3 className="mb-1 text-sm font-semibold text-gray-800">AI 결과 JSON 붙여넣기</h3>
              <p className="mb-3 text-xs text-gray-500">다른 AI에서 받은 JSON 응답을 아래에 붙여넣으세요.</p>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={'{\n  "summary": "...",\n  "details": {\n    "portfolioSummary": "...",\n    "riskWarning": "...",\n    "rebalanceSuggestion": "...",\n    "marketAdvice": "..."\n  }\n}'}
                className="w-full rounded-lg border border-gray-300 p-3 text-xs font-mono text-gray-800 focus:border-blue-400 focus:outline-none resize-none"
                rows={10}
              />
              {pasteError && <p className="mt-1.5 text-xs text-red-500">{pasteError}</p>}
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setShowPasteModal(false)}
                  className="rounded-md border border-gray-300 bg-white px-4 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleApplyPastedJson}
                  className="rounded-md bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
                >
                  확인
                </button>
              </div>
            </div>
          </div>
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
