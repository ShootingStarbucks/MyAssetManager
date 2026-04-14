import type {
  HoldingWithQuote,
  AllocationSlice,
  PortfolioSummary,
  CashAccount,
  ConcentrationWarning,
  RiskProfile,
  RiskMetrics,
  RebalanceSuggestion,
} from '@/types/portfolio.types';

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

// Re-export RebalanceSuggestion so callers can import it from this module
export type { RebalanceSuggestion };

export function calculateConcentrationWarnings(allocations: AllocationSlice[]): ConcentrationWarning[] {
  const warnings: ConcentrationWarning[] = [];
  // Single ticker checks
  for (const alloc of allocations) {
    if (alloc.ticker && alloc.percentage > 50) {
      warnings.push({
        type: 'DANGER',
        ticker: alloc.ticker,
        ratio: alloc.percentage,
        message: `${alloc.ticker} 비중이 ${alloc.percentage.toFixed(1)}%로 너무 높습니다 (위험)`,
      });
    } else if (alloc.ticker && alloc.percentage > 30) {
      warnings.push({
        type: 'WARNING',
        ticker: alloc.ticker,
        ratio: alloc.percentage,
        message: `${alloc.ticker} 비중이 ${alloc.percentage.toFixed(1)}%입니다 (주의)`,
      });
    }
  }
  // Asset class checks: sum stock ratio and crypto ratio
  const stockTotal = allocations
    .filter((a) => a.assetType === 'us-stock' || a.assetType === 'kr-stock')
    .reduce((s, a) => s + a.percentage, 0);
  const cryptoTotal = allocations
    .filter((a) => a.assetType === 'crypto')
    .reduce((s, a) => s + a.percentage, 0);
  if (stockTotal > 80) {
    warnings.push({
      type: 'ASSET_CLASS',
      assetType: 'stock',
      ratio: stockTotal,
      message: `주식 비중이 ${stockTotal.toFixed(1)}%로 집중되어 있습니다`,
    });
  }
  if (cryptoTotal > 80) {
    warnings.push({
      type: 'ASSET_CLASS',
      assetType: 'crypto',
      ratio: cryptoTotal,
      message: `암호화폐 비중이 ${cryptoTotal.toFixed(1)}%로 집중되어 있습니다`,
    });
  }
  return warnings;
}

export function calculateRiskProfile(allocations: AllocationSlice[]): RiskProfile {
  const cryptoTotal = allocations
    .filter((a) => a.assetType === 'crypto')
    .reduce((s, a) => s + a.percentage, 0);
  const stockTotal = allocations
    .filter((a) => a.assetType === 'us-stock' || a.assetType === 'kr-stock')
    .reduce((s, a) => s + a.percentage, 0);
  if (cryptoTotal >= 50) return 'AGGRESSIVE';
  if (cryptoTotal >= 30 || stockTotal >= 70) return 'MODERATE';
  return 'CONSERVATIVE';
}

export function calculateSharpeRatio(
  monthlyReturns: number[],
  riskFreeRate = 0.035
): number | null {
  if (monthlyReturns.length < 3) return null;
  const avg = monthlyReturns.reduce((s, r) => s + r, 0) / monthlyReturns.length;
  const variance =
    monthlyReturns.reduce((s, r) => s + Math.pow(r - avg, 2), 0) / monthlyReturns.length;
  const stdDev = Math.sqrt(variance);
  if (stdDev === 0) return null;
  return (avg - riskFreeRate / 12) / (stdDev * Math.sqrt(12));
}

export function calculateRebalanceSuggestions(
  current: AllocationSlice[],
  targets: Record<string, number>,
  totalValueKRW: number
): RebalanceSuggestion[] {
  const suggestions: RebalanceSuggestion[] = [];
  for (const [assetType, targetRatio] of Object.entries(targets)) {
    const currentRatio = current
      .filter(
        (a) =>
          a.assetType === assetType ||
          // group us-stock + kr-stock under 'stock'
          (assetType === 'stock' && (a.assetType === 'us-stock' || a.assetType === 'kr-stock'))
      )
      .reduce((s, a) => s + a.percentage, 0);
    const diffRatio = targetRatio - currentRatio;
    if (Math.abs(diffRatio) <= 10) continue;
    const action = assetType === 'cash' ? 'CASH_ADJUST' : diffRatio > 0 ? 'BUY' : 'SELL';
    const amountKRW = Math.abs(diffRatio / 100) * totalValueKRW;
    suggestions.push({
      assetType,
      currentRatio,
      targetRatio,
      diffRatio,
      action,
      amountKRW,
      message: `${assetType} 비중 ${currentRatio.toFixed(1)}% → 목표 ${targetRatio}% (${diffRatio > 0 ? '+' : ''}${diffRatio.toFixed(1)}%p)`,
    });
  }
  return suggestions;
}

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

  const riskMetrics: RiskMetrics = {
    riskProfile: calculateRiskProfile(allocations),
    concentrationWarnings: calculateConcentrationWarnings(allocations),
    sharpeRatio: null,
    sharpeRatioStatus: 'insufficient_data',
  };

  return {
    totalValue,
    totalChange,
    totalChangePercent,
    holdingsCount: holdings.length,
    allocations,
    currency: 'KRW',
    totalUnrealizedPnL,
    totalReturnPercent,
    riskMetrics,
  };
}
