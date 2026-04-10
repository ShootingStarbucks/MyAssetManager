export type AssetType = 'us-stock' | 'kr-stock' | 'crypto';

export interface NormalizedQuote {
  ticker: string;
  assetType: AssetType;
  price: number;
  change: number;
  changePercent: number;
  currency: 'USD' | 'KRW';
}

export interface QuoteResult {
  ticker: string;
  quote: NormalizedQuote | null;
  error?: 'INVALID_TICKER' | 'NETWORK_ERROR' | 'RATE_LIMITED';
}

export type ReturnPeriod = '1M' | '3M' | '6M' | '1Y' | '전체';

export interface HistoricalPrice {
  ticker: string;
  price: number;
  currency: 'USD' | 'KRW';
  date: string; // "YYYY-MM-DD"
}

export interface HistoricalPriceResult {
  ticker: string;
  price: number | null;
  currency: 'USD' | 'KRW' | null;
  date: string | null;
  error?: 'INVALID_TICKER' | 'NETWORK_ERROR' | 'RATE_LIMITED' | 'NO_DATA';
}

export interface PeriodReturn {
  ticker: string;
  currentPriceKRW: number;
  baselinePriceKRW: number | null;
  returnPercent: number | null;
  returnKRW: number | null;
}

export interface PortfolioPeriodReturn {
  period: ReturnPeriod;
  totalCurrentValueKRW: number;
  totalBaselineValueKRW: number | null;
  returnPercent: number | null;
  returnKRW: number | null;
}
