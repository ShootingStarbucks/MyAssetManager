import { useMemo } from 'react';
import { useHoldings } from './use-holdings';
import { useAssetQuotes } from './use-asset-quotes';
import { useCashBalance, useCashAccounts } from './use-cash';
import { calculatePortfolioSummary, toKRW } from '@/lib/calculate-portfolio';
import type { HoldingWithQuote } from '@/types/portfolio.types';
import type { QuoteResult } from '@/types/asset.types';

export function usePortfolioSummary() {
  const { data: holdings = [], isLoading: holdingsLoading } = useHoldings();
  const { data: quoteResults = [], isLoading: quotesLoading, isError, dataUpdatedAt } = useAssetQuotes(holdings);
  const { data: cashBalance = 0 } = useCashBalance();
  const { data: cashAccounts = [] } = useCashAccounts();

  const holdingsWithQuotes: HoldingWithQuote[] = useMemo(() => {
    const quoteMap = new Map<string, QuoteResult>(
      quoteResults.map((r) => [r.ticker, r])
    );

    return holdings.map((h) => {
      const result = quoteMap.get(h.ticker);
      const quote = result?.quote ?? null;
      const totalValue = quote ? toKRW(quote.price, quote.currency) * h.quantity : 0;
      return { ...h, quote, totalValue };
    });
  }, [holdings, quoteResults]);

  const summary = useMemo(
    () => calculatePortfolioSummary(holdingsWithQuotes, cashAccounts, cashBalance),
    [holdingsWithQuotes, cashAccounts, cashBalance]
  );

  return {
    holdings: holdingsWithQuotes,
    summary,
    cashBalance,
    isLoading: holdingsLoading || (quotesLoading && quoteResults.length === 0),
    isError,
    lastUpdatedAt: dataUpdatedAt ? new Date(dataUpdatedAt) : null,
  };
}
