import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Holding } from '@/types/portfolio.types';
import type { AssetType } from '@/types/asset.types';

async function fetchHoldings(): Promise<Holding[]> {
  const res = await fetch('/api/holdings');
  if (!res.ok) throw new Error('보유 자산을 불러오지 못했습니다');
  const data = await res.json();
  return data.holdings;
}

export function useHoldings() {
  return useQuery({
    queryKey: ['holdings'],
    queryFn: fetchHoldings,
  });
}

export function useAddHolding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { ticker: string; assetType: AssetType; quantity: number; avgCost?: number; exchange?: string; currency?: 'KRW' | 'USD'; purchaseDate?: string; memo?: string }) => {
      const res = await fetch('/api/holdings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message ?? '자산 추가에 실패했습니다');
      return data.holding as Holding;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holdings'] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
  });
}

export function useRemoveHolding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/holdings/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) {
        const data = await res.json();
        throw new Error(data.error?.message ?? '자산 삭제에 실패했습니다');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holdings'] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
  });
}

export function useUpdateHolding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, quantity, avgCost, currentPrice }: { id: string; quantity?: number; avgCost?: number | null; currentPrice?: number | null }) => {
      const res = await fetch(`/api/holdings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity, avgCost, currentPrice }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message ?? '수량 수정에 실패했습니다');
      return data.holding as Holding;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holdings'] });
    },
  });
}
