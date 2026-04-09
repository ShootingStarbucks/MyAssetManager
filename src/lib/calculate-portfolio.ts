import type { HoldingWithQuote, AllocationSlice, PortfolioSummary } from '@/types/portfolio.types';

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

export function calculatePortfolioSummary(holdings: HoldingWithQuote[]): PortfolioSummary {
  const validHoldings = holdings.filter((h) => h.quote !== null);

  const totalValue = validHoldings.reduce((sum, h) => {
    const priceKRW = toKRW(h.quote!.price, h.quote!.currency);
    return sum + priceKRW * h.quantity;
  }, 0);

  const totalYesterdayValue = validHoldings.reduce((sum, h) => {
    const prevPrice = h.quote!.price - h.quote!.change;
    const prevPriceKRW = toKRW(prevPrice, h.quote!.currency);
    return sum + prevPriceKRW * h.quantity;
  }, 0);

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

  return {
    totalValue,
    totalChange,
    totalChangePercent,
    holdingsCount: holdings.length,
    allocations,
    currency: 'KRW',
  };
}
