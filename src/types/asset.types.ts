export type AssetType = 'us-stock' | 'kr-stock' | 'crypto' | 'cash';

export type AssetClass = 'STOCK' | 'CRYPTO' | 'CASH';
export type Exchange = 'KOSPI' | 'KOSDAQ' | 'NASDAQ' | 'NYSE' | 'Upbit' | 'Bithumb' | 'Binance' | '기타';
export type Currency = 'KRW' | 'USD';
export type AccountType = '입출금' | '정기예금' | 'CMA' | '적금' | '기타';

export function assetTypeToClass(assetType: AssetType): AssetClass {
  if (assetType === 'us-stock' || assetType === 'kr-stock') return 'STOCK';
  if (assetType === 'crypto') return 'CRYPTO';
  if (assetType === 'cash') return 'CASH';
  return 'STOCK';
}

export interface NormalizedQuote {
  ticker: string;
  assetType: AssetType;
  price: number;
  change: number;
  changePercent: number;
  currency: 'USD' | 'KRW';
  name?: string;
}

export interface QuoteResult {
  ticker: string;
  quote: NormalizedQuote | null;
  error?: 'INVALID_TICKER' | 'NETWORK_ERROR' | 'RATE_LIMITED';
}
