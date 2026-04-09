export function formatKRW(value: number): string {
  if (Math.abs(value) >= 1_000_000_000_000) {
    return `${(value / 1_000_000_000_000).toFixed(2)}조원`;
  }
  if (Math.abs(value) >= 100_000_000) {
    return `${(value / 100_000_000).toFixed(2)}억원`;
  }
  if (Math.abs(value) >= 10_000) {
    return `${(value / 10_000).toFixed(1)}만원`;
  }
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number, digits = 2): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(digits)}%`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(value);
}

export function formatPrice(price: number, currency: 'KRW' | 'USD'): string {
  if (currency === 'KRW') {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0,
    }).format(price);
  }
  return formatUSD(price);
}
