import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { HoldingWithQuote } from '@/types/portfolio.types';
import type {
  ReturnPeriod,
  HistoricalPriceResult,
  PeriodReturn,
  PortfolioPeriodReturn,
} from '@/types/asset.types';
import type { Transaction } from '@/hooks/use-transactions';
import {
  getBaselineDate,
  toKRW,
  daysBetween,
  getQuantityAtPeriodStart,
  toCashFlow,
  calculateModifiedDietz,
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
  allTransactions: Transaction[],
  period: ReturnPeriod
): {
  periodReturns: PeriodReturn[];
  portfolioPeriodReturn: PortfolioPeriodReturn | null;
  isLoading: boolean;
  isError: boolean;
} {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // 각 종목의 기간 시작일, 기간 내 거래, 기초 수량을 계산
  const holdingData = useMemo(() => {
    return holdingsWithQuotes
      .filter((h) => h.quote !== null)
      .map((h) => {
        const baselineDate = getBaselineDate(period, h.createdAt);
        const txsInPeriod = allTransactions.filter(
          (tx) => tx.holdingId === h.id && tx.date.slice(0, 10) >= baselineDate
        );
        const qtyAtStart = getQuantityAtPeriodStart(h.quantity, txsInPeriod);
        return { holding: h, baselineDate, txsInPeriod, qtyAtStart };
      });
  }, [holdingsWithQuotes, allTransactions, period]);

  // 기초 수량이 있는 종목만 역사적 가격 조회 (신규 종목은 BMV = 0 이므로 불필요)
  const histPriceItems = useMemo(() => {
    return holdingData
      .filter((d) => d.qtyAtStart > 0)
      .map((d) => ({
        ticker: d.holding.ticker,
        assetType: d.holding.assetType,
        date: d.baselineDate,
      }));
  }, [holdingData]);

  const cacheKey = useMemo(
    () =>
      histPriceItems
        .map((i) => `${i.ticker}:${i.date}`)
        .sort()
        .join(','),
    [histPriceItems]
  );

  const { data: histData = [], isLoading, isError } = useQuery({
    queryKey: ['historical-prices', cacheKey],
    queryFn: () => fetchHistoricalPrices(histPriceItems),
    enabled: histPriceItems.length > 0,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 7 * 24 * 60 * 60 * 1000,
    retry: 1,
  });

  // 개별 종목 수익률 (HoldingRow 표시용)
  const periodReturns = useMemo((): PeriodReturn[] => {
    return holdingData.map(({ holding, baselineDate, txsInPeriod, qtyAtStart }) => {
      const emv = toKRW(holding.quote!.price, holding.quote!.currency) * holding.quantity;
      const totalDays = daysBetween(baselineDate, today);
      const cashFlows = txsInPeriod.map((tx) =>
        toCashFlow(tx, holding.assetType, baselineDate, totalDays)
      );

      let bmv = 0;
      if (qtyAtStart > 0) {
        const hist = histData.find((r) => r.ticker === holding.ticker);
        if (!hist || hist.price === null || hist.currency === null) {
          // 역사적 가격 없음 → 수익률 계산 불가
          return {
            ticker: holding.ticker,
            currentPriceKRW: emv,
            baselinePriceKRW: null,
            returnPercent: null,
            returnKRW: null,
          };
        }
        bmv = toKRW(hist.price, hist.currency) * qtyAtStart;
      }

      const result = calculateModifiedDietz(bmv, emv, cashFlows);
      return {
        ticker: holding.ticker,
        currentPriceKRW: emv,
        baselinePriceKRW: bmv > 0 ? bmv : null,
        returnPercent: result?.returnPercent ?? null,
        returnKRW: result?.returnKRW ?? null,
      };
    });
  }, [holdingData, histData, today]);

  // 포트폴리오 전체 수익률 — Modified Dietz 포트폴리오 기준
  const portfolioPeriodReturn = useMemo((): PortfolioPeriodReturn | null => {
    if (holdingData.length === 0) return null;

    // 포트폴리오 기준일: 모든 종목 기준일 중 가장 이른 날짜
    const earliestBaseline = holdingData.reduce(
      (min, d) => (d.baselineDate < min ? d.baselineDate : min),
      holdingData[0].baselineDate
    );
    const T = daysBetween(earliestBaseline, today);

    let totalBMV = 0;
    let totalEMV = 0;
    const allCashFlows: Array<{ amount: number; weight: number }> = [];

    for (const { holding, txsInPeriod, qtyAtStart } of holdingData) {
      if (!holding.quote) continue;

      totalEMV += toKRW(holding.quote.price, holding.quote.currency) * holding.quantity;

      if (qtyAtStart > 0) {
        const hist = histData.find((r) => r.ticker === holding.ticker);
        if (hist && hist.price !== null && hist.currency !== null) {
          totalBMV += toKRW(hist.price, hist.currency) * qtyAtStart;
        }
        // 역사적 가격 없는 종목은 BMV 기여 없이 CF만 반영
      }

      // 포트폴리오 기준일 기준으로 가중치 재계산
      for (const tx of txsInPeriod) {
        const txDate = tx.date.slice(0, 10);
        if (txDate < earliestBaseline) continue;
        const ti = daysBetween(earliestBaseline, txDate);
        const weight = T > 0 ? Math.max(0, (T - ti) / T) : 0;
        const priceKRW = holding.assetType === 'us-stock' ? tx.price * 1380 : tx.price;
        const feeKRW = tx.fee
          ? holding.assetType === 'us-stock'
            ? tx.fee * 1380
            : tx.fee
          : 0;
        const amount =
          tx.type === 'BUY'
            ? priceKRW * tx.quantity + feeKRW
            : -(priceKRW * tx.quantity - feeKRW);
        allCashFlows.push({ amount, weight });
      }
    }

    const result = calculateModifiedDietz(totalBMV, totalEMV, allCashFlows);

    return {
      period,
      totalCurrentValueKRW: totalEMV,
      totalBaselineValueKRW: totalBMV > 0 ? totalBMV : null,
      returnPercent: result?.returnPercent ?? null,
      returnKRW: result?.returnKRW ?? null,
    };
  }, [holdingData, histData, period, today]);

  return { periodReturns, portfolioPeriodReturn, isLoading, isError };
}
