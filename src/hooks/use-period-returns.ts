import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { HoldingWithQuote } from '@/types/portfolio.types';
import type {
  ReturnPeriod,
  HistoricalPriceResult,
  PeriodReturn,
  PortfolioPeriodReturn,
} from '@/types/asset.types';
import {
  getBaselineDate,
  calculatePeriodReturn,
  calculatePortfolioPeriodReturn,
} from '@/lib/calculate-portfolio';

async function fetchHistoricalPrices(
  items: { ticker: string; assetType: string; date: string }[]
): Promise<HistoricalPriceResult[]> {
  const res = await fetch('/api/historical-prices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) throw new Error('과거 가격 조회에 실패했습니다');
  const data = await res.json();
  return data.results as HistoricalPriceResult[];
}

export function usePeriodReturns(
  holdingsWithQuotes: HoldingWithQuote[],
  period: ReturnPeriod
): {
  periodReturns: PeriodReturn[];
  portfolioPeriodReturn: PortfolioPeriodReturn | null;
  isLoading: boolean;
  isError: boolean;
} {
  const items = useMemo(
    () =>
      holdingsWithQuotes
        .filter((h) => h.quote !== null)
        .map((h) => ({
          ticker: h.ticker,
          assetType: h.assetType,
          date: getBaselineDate(period, h.createdAt),
        })),
    [holdingsWithQuotes, period]
  );

  const cacheKey = useMemo(
    () =>
      items
        .map((i) => `${i.ticker}:${i.date}`)
        .sort()
        .join(','),
    [items]
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ['historical-prices', cacheKey],
    queryFn: () => fetchHistoricalPrices(items),
    enabled: items.length > 0,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 7 * 24 * 60 * 60 * 1000,
    retry: 1,
  });

  const periodReturns = useMemo(() => {
    if (!data) return [];
    return holdingsWithQuotes
      .filter((h) => h.quote !== null)
      .map((h) => {
        const hist = data.find((r) => r.ticker === h.ticker) ?? {
          ticker: h.ticker,
          price: null,
          currency: null,
          date: null,
        };
        return calculatePeriodReturn(h, hist);
      });
  }, [holdingsWithQuotes, data]);

  const portfolioPeriodReturn = useMemo(() => {
    if (!data) return null;
    return calculatePortfolioPeriodReturn(period, holdingsWithQuotes, data);
  }, [period, holdingsWithQuotes, data]);

  return { periodReturns, portfolioPeriodReturn, isLoading, isError };
}
