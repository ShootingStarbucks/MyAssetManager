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
