'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Eye, EyeOff, ExternalLink } from 'lucide-react';

interface ApiKeySettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function ApiKeySettingsModal({ open, onClose }: ApiKeySettingsModalProps) {
  const [hasKey, setHasKey] = useState(false);
  const [maskedKey, setMaskedKey] = useState<string | null>(null);
  const [inputKey, setInputKey] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setIsLoading(true);
    fetch('/api/settings/api-keys')
      .then((res) => res.json())
      .then((data: { hasKey: boolean; maskedKey: string | null }) => {
        setHasKey(data.hasKey);
        setMaskedKey(data.maskedKey);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [open]);

  async function handleSave() {
    if (!inputKey.trim()) {
      setError('API 키를 입력해주세요');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: inputKey.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        const errData = data as { error?: { message?: string } };
        setError(errData.error?.message ?? 'API 키 저장에 실패했습니다');
        return;
      }
      const saved = data as { hasKey: boolean; maskedKey: string | null };
      setHasKey(saved.hasKey);
      setMaskedKey(saved.maskedKey);
      setInputKey('');
      setShowInput(false);
    } catch {
      setError('API 키 저장에 실패했습니다');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    setError(null);
    try {
      const res = await fetch('/api/settings/api-keys', { method: 'DELETE' });
      if (!res.ok) {
        setError('API 키 삭제에 실패했습니다');
        return;
      }
      setHasKey(false);
      setMaskedKey(null);
      setShowInput(false);
    } catch {
      setError('API 키 삭제에 실패했습니다');
    } finally {
      setIsDeleting(false);
    }
  }

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl p-6 w-96 flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">AI 설정</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <p className="text-sm font-medium text-gray-700">Google AI API 키</p>
            <p className="mt-0.5 text-xs text-gray-500">
              개인 키를 등록하면 AI 기능(감성 분석, 포트폴리오 인사이트)에 본인 키를 제한 없이 사용합니다.
              키가 없으면 공유 서버 키를 <span className="font-medium text-amber-600">하루 3회</span>까지 사용할 수 있습니다.
            </p>
          </div>

          {isLoading ? (
            <p className="text-xs text-gray-400">불러오는 중...</p>
          ) : hasKey ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                <span className="text-xs font-mono text-green-700 flex-1">{maskedKey}</span>
                <span className="text-xs text-green-600 font-medium">등록됨</span>
              </div>
              {!showInput && (
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowInput(true); setError(null); }}
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    키 변경
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors"
                  >
                    {isDeleting ? '삭제 중...' : '키 삭제'}
                  </button>
                </div>
              )}
            </div>
          ) : null}

          {(!hasKey || showInput) && (
            <div className="flex flex-col gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-gray-500">API 키 입력</span>
                <input
                  type="password"
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void handleSave(); }}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="AIza..."
                  autoFocus={!hasKey}
                />
              </label>
              <div className="flex gap-2">
                {showInput && (
                  <button
                    onClick={() => { setShowInput(false); setInputKey(''); setError(null); }}
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    취소
                  </button>
                )}
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {isSaving ? '확인 중...' : '저장'}
                </button>
              </div>
            </div>
          )}

          {error && <p className="text-xs text-red-600">{error}</p>}

          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
          >
            <ExternalLink size={11} />
            Google AI Studio에서 무료 키 발급
          </a>
        </div>
      </div>
    </div>,
    document.body
  );
}
