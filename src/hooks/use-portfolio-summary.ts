import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useHoldings } from './use-holdings';
import { useAssetQuotes } from './use-asset-quotes';
import { useCashBalance, useCashAccounts } from './use-cash';
import { useExchangeRate } from './use-exchange-rate';
import { calculatePortfolioSummary, toKRW } from '@/lib/calculate-portfolio';
import type { HoldingWithQuote } from '@/types/portfolio.types';
import type { QuoteResult } from '@/types/asset.types';

interface Snapshot {
  snapDate: string;
  totalValue: number;
  breakdown: { stockRatio: number; cryptoRatio: number; cashRatio: number };
}

async function fetchSnapshots(): Promise<{ snapshots: Snapshot[] }> {
  const res = await fetch('/api/snapshots');
  if (!res.ok) throw new Error('스냅샷을 불러오지 못했습니다');
  return res.json();
}

function computeWeeklyReturn(snapshots: Snapshot[] | undefined, currentTotalValue: number) {
  if (!snapshots || snapshots.length < 7) return { amount: null, percent: null };
  // snapshots[0] = most recent (today/yesterday), snapshots[6] = ~7 days ago
  const sevenDaysAgo = snapshots[6];
  const amount = currentTotalValue - sevenDaysAgo.totalValue;
  const percent = sevenDaysAgo.totalValue !== 0
    ? (amount / sevenDaysAgo.totalValue) * 100
    : null;
  return { amount, percent };
}

export function usePortfolioSummary() {
  const { data: holdings = [], isLoading: holdingsLoading } = useHoldings();
  const { data: quoteResults = [], isLoading: quotesLoading, isError, dataUpdatedAt } = useAssetQuotes(holdings);
  const { data: cashBalance = 0 } = useCashBalance();
  const { data: cashAccounts = [] } = useCashAccounts();
  const { exchangeRate } = useExchangeRate();
  const { data: snapshotsData } = useQuery<{ snapshots: Snapshot[] }>({
    queryKey: ['snapshots'],
    queryFn: fetchSnapshots,
    staleTime: 5 * 60 * 1000,
  });
  const snapshots = snapshotsData?.snapshots;

  const holdingsWithQuotes: HoldingWithQuote[] = useMemo(() => {
    const quoteMap = new Map<string, QuoteResult>(
      quoteResults.map((r) => [r.ticker, r])
    );

    return holdings.map((h) => {
      const result = quoteMap.get(h.ticker);
      const quote = result?.quote ?? null;
      const totalValue = quote
        ? toKRW(quote.price, quote.currency, exchangeRate) * h.quantity
        : h.avgCost != null ? toKRW(h.avgCost, h.currency, exchangeRate) * h.quantity : 0;
      return { ...h, quote, totalValue };
    });
  }, [holdings, quoteResults, exchangeRate]);

  const summary = useMemo(() => {
    const calculatedSummary = calculatePortfolioSummary(holdingsWithQuotes, cashAccounts, cashBalance, exchangeRate);
    const { amount: weeklyChangeAmount, percent: weeklyChangePercent } = computeWeeklyReturn(snapshots, calculatedSummary.totalValue);
    return { ...calculatedSummary, weeklyChangeAmount, weeklyChangePercent };
  }, [holdingsWithQuotes, cashAccounts, cashBalance, exchangeRate, snapshots]);

  return {
    holdings: holdingsWithQuotes,
    summary,
    cashBalance,
    exchangeRate,
    isLoading: holdingsLoading || (quotesLoading && quoteResults.length === 0),
    isError,
    lastUpdatedAt: dataUpdatedAt ? new Date(dataUpdatedAt) : null,
  };
}
