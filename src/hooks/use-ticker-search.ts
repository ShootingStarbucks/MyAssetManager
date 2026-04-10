import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { AssetType } from '@/types/asset.types';
import type { SearchResult } from '@/types/api.types';

async function fetchSearch(query: string, assetType: AssetType): Promise<SearchResult[]> {
  const params = new URLSearchParams({ q: query, assetType });
  const res = await fetch(`/api/search?${params}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.results as SearchResult[];
}

export function useTickerSearch(query: string, assetType: AssetType) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  return useQuery({
    queryKey: ['search', assetType, debouncedQuery],
    queryFn: () => fetchSearch(debouncedQuery, assetType),
    enabled: debouncedQuery.length >= 1,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
