import type { AssetType, NormalizedQuote, Currency, AccountType } from './asset.types';

export interface Holding {
  id: string;
  ticker: string;
  name?: string | null;         // 종목명
  assetType: AssetType;
  exchange?: string | null;     // 거래소
  quantity: number;
  avgCost?: number | null;
  currency: Currency;           // 통화 (default "KRW")
  purchaseDate?: string | null; // 최초 매수일 (ISO string)
  memo?: string | null;         // 메모
  createdAt: string;
}

export interface HoldingWithQuote extends Holding {
  quote: NormalizedQuote | null;
  totalValue: number;
}

export interface AllocationSlice {
  ticker: string;
  assetType: AssetType | 'cash';
  value: number;
  percentage: number;
  color: string;
}

export interface CashAccount {
  id: string;
  institution: string;
  accountType: AccountType;
  amount: number;
  interestRate?: number | null;
  maturityDate?: string | null;
  memo?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioSummary {
  totalValue: number;
  totalChange: number;
  totalChangePercent: number;
  holdingsCount: number;
  allocations: AllocationSlice[];
  currency: 'KRW';
  totalUnrealizedPnL: number | null;
  totalReturnPercent: number | null;
  cashAccounts?: CashAccount[];  // NEW — optional for backward compat
}
