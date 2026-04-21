import type { AssetType } from './asset.types';

export interface ApiError {
  code: 'RATE_LIMITED' | 'INVALID_TICKER' | 'NETWORK_ERROR' | 'UNAUTHORIZED' | 'VALIDATION_ERROR' | 'UNKNOWN';
  message: string;
  ticker?: string;
}

export interface QuoteRequestItem {
  ticker: string;
  assetType: AssetType;
}

export interface QuoteRequest {
  holdings: QuoteRequestItem[];
}

export interface FinnhubQuoteResponse {
  c: number;   // Current price
  d: number;   // Change
  dp: number;  // Percent change
  h: number;   // High
  l: number;   // Low
  o: number;   // Open
  pc: number;  // Previous close
  t: number;   // Timestamp
}

export interface HistoricalPriceRequestItem {
  ticker: string;
  assetType: import('./asset.types').AssetType;
  date: string; // "YYYY-MM-DD"
}

export interface SearchResult {
  ticker: string; // US: "AAPL", KR: "005930", Crypto: "BTC"
  name: string;   // US: "Apple Inc.", KR: "삼성전자", Crypto: "Bitcoin"
}
