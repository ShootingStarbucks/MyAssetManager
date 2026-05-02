'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const TOUR_QUERY_KEY = ['tour'];

interface TourStatus {
  hasSeenTour: boolean;
}

async function fetchTourStatus(): Promise<TourStatus> {
  const res = await fetch('/api/tour');
  if (!res.ok) throw new Error('투어 상태를 불러오지 못했습니다');
  return res.json();
}

export function useOnboardingTour() {
  const queryClient = useQueryClient();
  const [isRunning, setIsRunning] = useState(false);

  const { data, isLoading } = useQuery<TourStatus>({
    queryKey: TOUR_QUERY_KEY,
    queryFn: fetchTourStatus,
    staleTime: Infinity,
  });

  const hasSeenTour = data?.hasSeenTour ?? true;

  useEffect(() => {
    if (!isLoading && !hasSeenTour) {
      setIsRunning(true);
    }
  }, [isLoading, hasSeenTour]);

  const patchTour = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/tour', { method: 'PATCH' });
      if (!res.ok) throw new Error('투어 완료 처리에 실패했습니다');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TOUR_QUERY_KEY });
    },
  });

  const deleteTour = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/tour', { method: 'DELETE' });
      if (!res.ok) throw new Error('투어 초기화에 실패했습니다');
      return res.json();
    },
    onSuccess: () => {
      queryClient.setQueryData<TourStatus>(TOUR_QUERY_KEY, { hasSeenTour: false });
      setIsRunning(true);
    },
  });

  function handleTourEnd() {
    setIsRunning(false);
    patchTour.mutate();
  }

  function startTourManually() {
    deleteTour.mutate();
  }

  return {
    isLoading,
    hasSeenTour,
    isRunning,
    setIsRunning,
    handleTourEnd,
    startTourManually,
  };
}
