import type { HoldingWithQuote, AllocationSlice, PortfolioSummary, CashAccount } from '@/types/portfolio.types';

// USD → KRW 환율 (실제 서비스에서는 환율 API 사용 권장)
// 현재는 고정 환율 사용 (추후 실시간 환율로 대체 가능)
export const USD_TO_KRW = 1380;

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

const ASSET_CLASS_COLORS: Record<string, string> = {
  'us-stock': '#3b82f6',
  'kr-stock': '#3b82f6',
  'crypto': '#f59e0b',
  'cash': '#10b981',
};

export function calculatePortfolioSummary(
  holdings: HoldingWithQuote[],
  cashAccounts: CashAccount[] = [],
  legacyCashBalance = 0
): PortfolioSummary {
  const validHoldings = holdings.filter((h) => h.quote !== null);

  const holdingsValue = validHoldings.reduce((sum, h) => {
    const priceKRW = toKRW(h.quote!.price, h.quote!.currency);
    return sum + priceKRW * h.quantity;
  }, 0);

  // 현금 계좌 합산 + 레거시 현금 잔액
  const cashAccountsTotal = cashAccounts.map(a => a.amount).reduce((s, a) => s + a, 0);
  const totalCash = cashAccountsTotal + legacyCashBalance;
  // 음수 현금은 총 자산 계산에서 0으로 처리 (미설정 또는 과차감 방지)
  const cashForTotal = Math.max(0, totalCash);
  const totalValue = holdingsValue + cashForTotal;

  const totalYesterdayValue = validHoldings.reduce((sum, h) => {
    const prevPrice = h.quote!.price - h.quote!.change;
    const prevPriceKRW = toKRW(prevPrice, h.quote!.currency);
    return sum + prevPriceKRW * h.quantity;
  }, cashForTotal); // 현금은 전일 대비 변동 없음 (음수 현금은 0으로 처리)

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
      color: ASSET_CLASS_COLORS[h.assetType] ?? CHART_COLORS[i % CHART_COLORS.length],
    };
  });

  // 현금 슬라이스 추가
  if (cashForTotal > 0) {
    allocations.push({
      ticker: '현금',
      assetType: 'cash',
      value: cashForTotal,
      percentage: totalValue > 0 ? (cashForTotal / totalValue) * 100 : 0,
      color: ASSET_CLASS_COLORS['cash'],
    });
  }

  const holdingsWithAvgCost = validHoldings.filter(h => h.avgCost != null);
  let totalUnrealizedPnL: number | null = null;
  let totalReturnPercent: number | null = null;

  if (holdingsWithAvgCost.length > 0) {
    let pnlSum = 0;
    let investedSum = 0;
    for (const h of holdingsWithAvgCost) {
      const { unrealizedPnL, avgCostKRW } = calculateUnrealizedPnL(h);
      if (unrealizedPnL !== null && avgCostKRW !== null) {
        pnlSum += unrealizedPnL;
        investedSum += avgCostKRW * h.quantity;
      }
    }
    totalUnrealizedPnL = pnlSum;
    totalReturnPercent = investedSum > 0 ? (pnlSum / investedSum) * 100 : null;
  }

  return {
    totalValue,
    totalChange,
    totalChangePercent,
    holdingsCount: holdings.length,
    allocations,
    currency: 'KRW',
    totalUnrealizedPnL,
    totalReturnPercent,
  };
}
