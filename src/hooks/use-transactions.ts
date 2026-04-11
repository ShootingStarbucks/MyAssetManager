import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Transaction {
  id: string;
  holdingId: string;
  ticker: string;
  assetType: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  fee: number | null;
  date: string;
  note: string | null;
  createdAt: string;
}

export function useTransactions(holdingId: string | null) {
  return useQuery({
    queryKey: ['transactions', holdingId],
    queryFn: async () => {
      if (!holdingId) return [];
      const res = await fetch(`/api/transactions?holdingId=${holdingId}`);
      if (!res.ok) throw new Error('거래 내역을 불러오지 못했습니다');
      const data = await res.json();
      return data.transactions as Transaction[];
    },
    enabled: !!holdingId,
  });
}

export function useAddTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      holdingId: string;
      type: 'BUY' | 'SELL';
      quantity: number;
      price: number;
      fee?: number;
      date?: string;
      note?: string;
    }) => {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message ?? '거래 등록에 실패했습니다');
      return data.transaction as Transaction;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['transactions', variables.holdingId] });
      queryClient.invalidateQueries({ queryKey: ['holdings'] });
      queryClient.invalidateQueries({ queryKey: ['cash'] });
    },
  });
}

export function useRemoveTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, holdingId }: { id: string; holdingId: string }) => {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) {
        const data = await res.json();
        throw new Error(data.error?.message ?? '거래 삭제에 실패했습니다');
      }
      return holdingId;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['transactions', variables.holdingId] });
      queryClient.invalidateQueries({ queryKey: ['holdings'] });
      queryClient.invalidateQueries({ queryKey: ['cash'] });
    },
  });
}
