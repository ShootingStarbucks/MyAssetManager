import type { HoldingWithQuote, AllocationSlice, PortfolioSummary } from '@/types/portfolio.types';
import type { ReturnPeriod, HistoricalPriceResult, PeriodReturn, PortfolioPeriodReturn } from '@/types/asset.types';

// Modified Dietz 계산에 사용되는 내부 타입
export interface CashFlow {
  amount: number; // KRW 기준. 매수: 양수(투입), 매도: 음수(회수)
  weight: number; // (T - tᵢ) / T
}

// USD → KRW 환율 (실제 서비스에서는 환율 API 사용 권장)
// 현재는 고정 환율 사용 (추후 실시간 환율로 대체 가능)
const USD_TO_KRW = 1380;

const CHART_COLORS = [
  '#3B82F6', // blue-500
  '#10B981', // emerald-500
  '#F59E0B', // amber-500
  '#EF4444', // red-500
  '#8B5CF6', // violet-500
  '#06B6D4', // cyan-500
  '#F97316', // orange-500
  '#84CC16', // lime-500
  '#EC4899', // pink-500
  '#14B8A6', // teal-500
];

export function toKRW(price: number, currency: 'KRW' | 'USD'): number {
  return currency === 'USD' ? price * USD_TO_KRW : price;
}

export function calculateTotalValue(holdings: HoldingWithQuote[]): number {
  return holdings.reduce((sum, h) => {
    if (!h.quote) return sum;
    const priceKRW = toKRW(h.quote.price, h.quote.currency);
    return sum + priceKRW * h.quantity;
  }, 0);
}

export function calculateUnrealizedPnL(holding: HoldingWithQuote): {
  unrealizedPnL: number | null;
  unrealizedPnLPercent: number | null;
  avgCostKRW: number | null;
} {
  if (holding.avgCost == null || holding.quote == null) {
    return { unrealizedPnL: null, unrealizedPnLPercent: null, avgCostKRW: null };
  }
  const avgCostKRW = toKRW(holding.avgCost, holding.quote.currency);
  const currentPriceKRW = toKRW(holding.quote.price, holding.quote.currency);
  const unrealizedPnL = (currentPriceKRW - avgCostKRW) * holding.quantity;
  const unrealizedPnLPercent = ((currentPriceKRW - avgCostKRW) / avgCostKRW) * 100;
  return { unrealizedPnL, unrealizedPnLPercent, avgCostKRW };
}

export function calculatePortfolioSummary(
  holdings: HoldingWithQuote[],
  cashBalance = 0
): PortfolioSummary {
  const validHoldings = holdings.filter((h) => h.quote !== null);

  const holdingsValue = validHoldings.reduce((sum, h) => {
    const priceKRW = toKRW(h.quote!.price, h.quote!.currency);
    return sum + priceKRW * h.quantity;
  }, 0);

  const totalValue = holdingsValue + cashBalance;

  const totalYesterdayValue = validHoldings.reduce((sum, h) => {
    const prevPrice = h.quote!.price - h.quote!.change;
    const prevPriceKRW = toKRW(prevPrice, h.quote!.currency);
    return sum + prevPriceKRW * h.quantity;
  }, cashBalance); // 현금은 전일 대비 변동 없음

  const totalChange = totalValue - totalYesterdayValue;
  const totalChangePercent =
    totalYesterdayValue !== 0 ? (totalChange / totalYesterdayValue) * 100 : 0;

  const allocations: AllocationSlice[] = validHoldings.map((h, i) => {
    const priceKRW = toKRW(h.quote!.price, h.quote!.currency);
    const value = priceKRW * h.quantity;
    return {
      ticker: h.ticker,
      assetType: h.assetType,
      value,
      percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
      color: CHART_COLORS[i % CHART_COLORS.length],
    };
  });

  // 현금 슬라이스 추가
  if (cashBalance > 0) {
    allocations.push({
      ticker: '현금',
      assetType: 'cash',
      value: cashBalance,
      percentage: totalValue > 0 ? (cashBalance / totalValue) * 100 : 0,
      color: '#6B7280', // gray-500
    });
  }

  const holdingsWithAvgCost = validHoldings.filter(h => h.avgCost != null);
  let totalUnrealizedPnL: number | null = null;
  if (holdingsWithAvgCost.length > 0) {
    totalUnrealizedPnL = holdingsWithAvgCost.reduce((sum, h) => {
      const { unrealizedPnL } = calculateUnrealizedPnL(h);
      return sum + (unrealizedPnL ?? 0);
    }, 0);
  }

  return {
    totalValue,
    totalChange,
    totalChangePercent,
    holdingsCount: holdings.length,
    allocations,
    currency: 'KRW',
    totalUnrealizedPnL,
  };
}

// ─── Modified Dietz 헬퍼 ────────────────────────────────────────────────────

/** 두 날짜(YYYY-MM-DD) 사이의 일수를 반환합니다 (dateA → dateB). */
export function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA + 'T00:00:00Z').getTime();
  const b = new Date(dateB + 'T00:00:00Z').getTime();
  return Math.round((b - a) / 86_400_000);
}

/**
 * 현재 수량과 기간 내 거래 목록으로 기간 시작 시점의 수량을 역산합니다.
 * BUY는 빼고, SELL은 더하는 방식으로 역방향 계산합니다.
 */
export function getQuantityAtPeriodStart(
  currentQty: number,
  transactionsInPeriod: Array<{ type: 'BUY' | 'SELL'; quantity: number }>
): number {
  return transactionsInPeriod.reduce((qty, tx) => {
    return tx.type === 'BUY' ? qty - tx.quantity : qty + tx.quantity;
  }, currentQty);
}

/**
 * 거래 내역 하나를 KRW 기준 CashFlow로 변환합니다.
 * @param tx 거래 내역
 * @param assetType 자산 유형 (환율 변환 여부 결정)
 * @param baselineDate 기간 시작일 (YYYY-MM-DD)
 * @param totalDays 기간 전체 일수 T
 */
export function toCashFlow(
  tx: { type: 'BUY' | 'SELL'; quantity: number; price: number; fee: number | null; date: string },
  assetType: string,
  baselineDate: string,
  totalDays: number
): CashFlow {
  const ti = daysBetween(baselineDate, tx.date.slice(0, 10));
  const weight = totalDays > 0 ? Math.max(0, (totalDays - ti) / totalDays) : 0;
  const priceKRW = assetType === 'us-stock' ? tx.price * USD_TO_KRW : tx.price;
  const feeKRW = tx.fee
    ? assetType === 'us-stock'
      ? tx.fee * USD_TO_KRW
      : tx.fee
    : 0;
  const amount =
    tx.type === 'BUY'
      ? priceKRW * tx.quantity + feeKRW
      : -(priceKRW * tx.quantity - feeKRW);
  return { amount, weight };
}

/**
 * Modified Dietz 수익률을 계산합니다.
 * R = (EMV - BMV - CF_net) / (BMV + Σ(CFᵢ × Wᵢ))
 *
 * @param bmv 기초 평가액 (KRW)
 * @param emv 기말 평가액 (KRW)
 * @param cashFlows 기간 내 가중 현금흐름 목록
 * @returns 수익률(%) 및 수익금(KRW), 분모가 0이면 null
 */
export function calculateModifiedDietz(
  bmv: number,
  emv: number,
  cashFlows: CashFlow[]
): { returnPercent: number; returnKRW: number } | null {
  const cfNet = cashFlows.reduce((s, cf) => s + cf.amount, 0);
  const weightedCf = cashFlows.reduce((s, cf) => s + cf.amount * cf.weight, 0);
  const denominator = bmv + weightedCf;

  if (denominator === 0) return null;

  const returnKRW = emv - bmv - cfNet;
  const returnPercent = (returnKRW / denominator) * 100;
  return { returnPercent, returnKRW };
}

// ─── 기존 기간 수익률 계산 ──────────────────────────────────────────────────

export function getBaselineDate(period: ReturnPeriod, createdAt: string): string {
  if (period === '전체') {
    return createdAt.slice(0, 10); // "YYYY-MM-DD"
  }
  const days = { '1M': 30, '3M': 90, '6M': 180, '1Y': 365 }[period];
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

export function calculatePeriodReturn(
  holding: HoldingWithQuote,
  historicalResult: HistoricalPriceResult
): PeriodReturn {
  const currentPriceKRW = holding.quote
    ? toKRW(holding.quote.price, holding.quote.currency) * holding.quantity
    : 0;

  if (historicalResult.price === null || historicalResult.currency === null) {
    return {
      ticker: holding.ticker,
      currentPriceKRW,
      baselinePriceKRW: null,
      returnPercent: null,
      returnKRW: null,
    };
  }

  const baselinePriceKRW = toKRW(historicalResult.price, historicalResult.currency) * holding.quantity;
  const returnKRW = currentPriceKRW - baselinePriceKRW;
  const returnPercent = baselinePriceKRW !== 0 ? (returnKRW / baselinePriceKRW) * 100 : null;

  return {
    ticker: holding.ticker,
    currentPriceKRW,
    baselinePriceKRW,
    returnPercent,
    returnKRW,
  };
}

export function calculatePortfolioPeriodReturn(
  period: ReturnPeriod,
  holdingsWithQuotes: HoldingWithQuote[],
  historicalResults: HistoricalPriceResult[]
): PortfolioPeriodReturn {
  const resultMap = new Map(historicalResults.map((r) => [r.ticker, r]));

  let totalCurrentValueKRW = 0;
  let totalBaselineValueKRW = 0;
  let hasAllBaselines = true;

  for (const holding of holdingsWithQuotes) {
    if (!holding.quote) continue;
    const current = toKRW(holding.quote.price, holding.quote.currency) * holding.quantity;
    totalCurrentValueKRW += current;

    const hist = resultMap.get(holding.ticker);
    if (!hist || hist.price === null || hist.currency === null) {
      hasAllBaselines = false;
    } else {
      totalBaselineValueKRW += toKRW(hist.price, hist.currency) * holding.quantity;
    }
  }

  if (!hasAllBaselines || totalBaselineValueKRW === 0) {
    return {
      period,
      totalCurrentValueKRW,
      totalBaselineValueKRW: null,
      returnPercent: null,
      returnKRW: null,
    };
  }

  const returnKRW = totalCurrentValueKRW - totalBaselineValueKRW;
  const returnPercent = (returnKRW / totalBaselineValueKRW) * 100;

  return {
    period,
    totalCurrentValueKRW,
    totalBaselineValueKRW,
    returnPercent,
    returnKRW,
  };
}
