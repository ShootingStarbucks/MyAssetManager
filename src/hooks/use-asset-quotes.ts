import { useQuery } from '@tanstack/react-query';
import type { Holding } from '@/types/portfolio.types';
import type { QuoteResult } from '@/types/asset.types';

const REFRESH_MS = Number(process.env.NEXT_PUBLIC_REFRESH_MS ?? 60_000);

async function fetchQuotes(holdings: Holding[]): Promise<QuoteResult[]> {
  const res = await fetch('/api/quotes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ holdings: holdings.map((h) => ({ ticker: h.ticker, assetType: h.assetType })) }),
  });

  if (res.status === 429) {
    const err = new Error('API 요청 한도 초과');
    (err as NodeJS.ErrnoException).code = 'RATE_LIMITED';
    throw err;
  }

  if (!res.ok) throw new Error('가격 조회에 실패했습니다');

  const data = await res.json();
  return data.results as QuoteResult[];
}

export function useAssetQuotes(holdings: Holding[]) {
  const sortedKey = holdings
    .map((h) => h.ticker)
    .sort()
    .join(',');

  return useQuery({
    queryKey: ['quotes', sortedKey],
    queryFn: () => fetchQuotes(holdings),
    enabled: holdings.length > 0,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchInterval: REFRESH_MS,
    refetchIntervalInBackground: false,
    retry: (failureCount, error) => {
      if ((error as NodeJS.ErrnoException).code === 'RATE_LIMITED') return false;
      return failureCount < 2;
    },
  });
}
