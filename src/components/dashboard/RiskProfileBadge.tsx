'use client';

import type { RiskProfile } from '@/types/portfolio.types';

interface RiskProfileBadgeProps {
  riskProfile: RiskProfile;
}

const RISK_CONFIG: Record<RiskProfile, { label: string; color: string }> = {
  AGGRESSIVE: { label: '공격적', color: '#ef4444' },
  MODERATE:   { label: '중립적', color: '#f59e0b' },
  CONSERVATIVE: { label: '보수적', color: '#10b981' },
};

export function RiskProfileBadge({ riskProfile }: RiskProfileBadgeProps) {
  const { label, color } = RISK_CONFIG[riskProfile];

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold text-white"
      style={{ backgroundColor: color }}
    >
      {label}
    </span>
  );
}
