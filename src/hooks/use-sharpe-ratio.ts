import { useQuery } from '@tanstack/react-query';
import { calculateSharpeRatio, snapshotsToMonthlyReturns } from '@/lib/calculate-portfolio';

interface Snapshot {
  totalValue: number;
  snapDate: string;
}

export function useSharpeRatio() {
  const { data, isLoading } = useQuery<{ snapshots: Snapshot[] }>({
    queryKey: ['snapshots'],
    queryFn: () => fetch('/api/snapshots').then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading || !data) {
    return { sharpeRatio: null, isLoading };
  }

  const chronological = [...data.snapshots].reverse();
  const monthlyReturns = snapshotsToMonthlyReturns(chronological);
  const sharpeRatio = calculateSharpeRatio(monthlyReturns);

  return { sharpeRatio, isLoading: false };
}
