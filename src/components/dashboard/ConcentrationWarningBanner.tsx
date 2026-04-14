'use client';

import type { ConcentrationWarning } from '@/types/portfolio.types';

interface ConcentrationWarningBannerProps {
  warnings: ConcentrationWarning[];
}

export function ConcentrationWarningBanner({ warnings }: ConcentrationWarningBannerProps) {
  if (!warnings || warnings.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      {warnings.map((warning, index) => {
        const isDanger = warning.type === 'DANGER';
        return (
          <div
            key={index}
            className={`px-4 py-2 rounded text-sm font-medium text-white ${
              isDanger ? 'bg-red-600' : 'bg-amber-500'
            }`}
          >
            {warning.message}
          </div>
        );
      })}
    </div>
  );
}
