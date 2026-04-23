import { useQuery } from '@tanstack/react-query';
import type { StockDetailResult } from '@/types/sentiment.types';

async function fetchStockDetail(holdingId: string): Promise<StockDetailResult> {
  const res = await fetch('/api/news/sentiment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ holdingId }),
  });
  if (!res.ok) throw new Error('감성 분석 데이터를 불러오지 못했습니다');
  return res.json();
}

export function useStockDetail(holdingId: string | undefined) {
  return useQuery({
    queryKey: ['stock-detail', holdingId],
    queryFn: () => fetchStockDetail(holdingId!),
    enabled: !!holdingId,
    staleTime: 5 * 60 * 1000,
  });
}
