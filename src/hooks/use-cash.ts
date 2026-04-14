import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { CashAccount } from '@/types/portfolio.types';

const CASH_QUERY_KEY = ['cashAccounts'];

export function useCashAccounts() {
  return useQuery<CashAccount[]>({
    queryKey: CASH_QUERY_KEY,
    queryFn: async () => {
      const res = await fetch('/api/cash/accounts');
      if (!res.ok) throw new Error('Failed to fetch cash accounts');
      return res.json();
    },
  });
}

export function useAddCashAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<CashAccount, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
      const res = await fetch('/api/cash/accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error('Failed to add cash account');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CASH_QUERY_KEY }),
  });
}

export function useUpdateCashAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<CashAccount> & { id: string }) => {
      const res = await fetch(`/api/cash/accounts/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error('Failed to update cash account');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CASH_QUERY_KEY }),
  });
}

export function useRemoveCashAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/cash/accounts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete cash account');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CASH_QUERY_KEY }),
  });
}

export function useCashBalance() {
  return useQuery({
    queryKey: ['cash'],
    queryFn: async () => {
      const res = await fetch('/api/cash');
      if (!res.ok) throw new Error('현금 잔액을 불러오지 못했습니다');
      const data = await res.json();
      return data.cashBalance as number;
    },
  });
}

export function useUpdateCashBalance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cashBalance: number) => {
      const res = await fetch('/api/cash', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cashBalance }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message ?? '현금 잔액 수정에 실패했습니다');
      return data.cashBalance as number;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash'] });
    },
  });
}
