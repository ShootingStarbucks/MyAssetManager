export type RiskLevel = 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
export type ConcentrationWarning = 'WARNING' | 'DANGER';

export interface ConcentrationAlert {
  ticker: string;
  percentage: number;
  level: ConcentrationWarning;
}

export interface AssetClassAlert {
  assetClass: 'STOCK' | 'CRYPTO' | 'CASH';
  percentage: number;
  level: ConcentrationWarning;
}

export interface RiskProfile {
  level: RiskLevel;
  concentrationAlerts: ConcentrationAlert[];
  assetClassAlert: AssetClassAlert | null;
}

export interface RebalancingSuggestion {
  target: string;                 // ticker or asset class label
  assetType: string;
  currentPercentage: number;
  targetPercentage: number;
  diffPercentage: number;         // positive = overweight, negative = underweight
  suggestedAmountKRW: number;
  action: 'BUY' | 'SELL';
}
