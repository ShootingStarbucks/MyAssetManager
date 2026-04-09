import type { AssetType, NormalizedQuote } from './asset.types';

export interface Holding {
  id: string;
  ticker: string;
  assetType: AssetType;
  quantity: number;
  createdAt: string;
}

export interface HoldingWithQuote extends Holding {
  quote: NormalizedQuote | null;
  totalValue: number;
}

export interface AllocationSlice {
  ticker: string;
  assetType: AssetType;
  value: number;
  percentage: number;
  color: string;
}

export interface PortfolioSummary {
  totalValue: number;
  totalChange: number;
  totalChangePercent: number;
  holdingsCount: number;
  allocations: AllocationSlice[];
  currency: 'KRW';
}
