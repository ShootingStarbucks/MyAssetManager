interface BadgeProps {
  value: number;
  suffix?: string;
  className?: string;
}

export function ChangeBadge({ value, suffix = '%', className = '' }: BadgeProps) {
  const isPositive = value > 0;
  const isZero = value === 0;

  const colorClass = isZero
    ? 'bg-gray-100 text-gray-600'
    : isPositive
    ? 'bg-green-50 text-green-700'
    : 'bg-red-50 text-red-700';

  const prefix = isZero ? '' : isPositive ? '+' : '';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClass} ${className}`}>
      {prefix}{value.toFixed(2)}{suffix}
    </span>
  );
}

export function AssetTypeBadge({ type }: { type: string }) {
  const config: Record<string, { label: string; color: string }> = {
    'us-stock': { label: '미국주식', color: 'bg-blue-50 text-blue-700' },
    'kr-stock': { label: '한국주식', color: 'bg-emerald-50 text-emerald-700' },
    crypto: { label: '암호화폐', color: 'bg-amber-50 text-amber-700' },
  };

  const { label, color } = config[type] ?? { label: type, color: 'bg-gray-100 text-gray-600' };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

export function ManualPriceBadge() {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
      현재가 미입력
    </span>
  );
}
