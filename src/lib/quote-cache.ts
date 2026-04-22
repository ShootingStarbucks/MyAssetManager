import 'server-only';
import type { NormalizedQuote } from '@/types/asset.types';

const CACHE_TTL_MS = 55_000;
const INVALID_TTL_MS = 5 * 60_000;

interface CacheEntry {
  data: NormalizedQuote;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
// INVALID_TICKER 키 → 만료 시각 (5분 캐시)
const invalidCache = new Map<string, number>();
const inflight = new Map<string, Promise<NormalizedQuote>>();

let lastPruneAt = 0;

function pruneStale(): void {
  const now = Date.now();
  if (now - lastPruneAt < 60_000) return;
  lastPruneAt = now;
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) cache.delete(key);
  }
  for (const [key, expiresAt] of invalidCache) {
    if (expiresAt <= now) invalidCache.delete(key);
  }
}

export function getCached(key: string): NormalizedQuote | null {
  const entry = cache.get(key);
  if (!entry || entry.expiresAt <= Date.now()) return null;
  return entry.data;
}

export function setCached(key: string, data: NormalizedQuote, ttlMs = CACHE_TTL_MS): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export async function getOrFetch(
  key: string,
  fetcher: () => Promise<NormalizedQuote>
): Promise<NormalizedQuote> {
  pruneStale();

  // 정상 캐시 히트
  const hit = getCached(key);
  if (hit) return hit;

  // INVALID_TICKER 캐시 히트 → 5분간 재호출 없이 즉시 에러
  const invalidExpiry = invalidCache.get(key);
  if (invalidExpiry && invalidExpiry > Date.now()) {
    const err = new Error(`Invalid ticker: ${key}`);
    (err as NodeJS.ErrnoException).code = 'INVALID_TICKER';
    throw err;
  }

  // 동일 키 in-flight 중복 제거
  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = fetcher().then(
    (data) => {
      setCached(key, data, CACHE_TTL_MS);
      inflight.delete(key);
      return data;
    },
    (err: NodeJS.ErrnoException) => {
      inflight.delete(key);
      if (err.code === 'INVALID_TICKER') {
        invalidCache.set(key, Date.now() + INVALID_TTL_MS);
      }
      // NETWORK_ERROR / RATE_LIMITED 등 일시적 오류는 캐시 안 함
      throw err;
    }
  );

  inflight.set(key, promise);
  return promise;
}
