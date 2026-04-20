import { useQuery } from '@tanstack/react-query';

async function fetchExchangeRate(): Promise<number> {
  const res = await fetch('/api/settings/exchange-rate');
  if (!res.ok) return 1380;
  const data = await res.json();
  return (data as { exchangeRate: number }).exchangeRate ?? 1380;
}

export function useExchangeRate() {
  const { data } = useQuery({
    queryKey: ['exchange-rate'],
    queryFn: fetchExchangeRate,
    staleTime: 5 * 60_000,
    gcTime: 60 * 60_000,
  });
  return { exchangeRate: data ?? 1380 };
}
