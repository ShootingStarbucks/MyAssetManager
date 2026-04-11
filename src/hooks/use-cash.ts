import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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
