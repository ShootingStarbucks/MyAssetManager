import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { searchUsStocks } from '@/lib/finnhub-client';
import { searchKrStocks } from '@/lib/yahoo-finance-client';
import { searchCrypto } from '@/lib/coingecko-client';
import type { ApiError, SearchResult } from '@/types/api.types';

const querySchema = z.object({
  q: z.string().min(1).max(50),
  assetType: z.enum(['us-stock', 'kr-stock', 'crypto']),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } satisfies ApiError },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({
    q: searchParams.get('q'),
    assetType: searchParams.get('assetType'),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: '잘못된 요청입니다' } satisfies ApiError },
      { status: 400 }
    );
  }

  const { q, assetType } = parsed.data;

  let results: SearchResult[] = [];
  try {
    if (assetType === 'us-stock') {
      results = await searchUsStocks(q);
    } else if (assetType === 'kr-stock') {
      results = await searchKrStocks(q);
    } else {
      results = searchCrypto(q);
    }
  } catch {
    results = [];
  }

  return NextResponse.json({ results });
}
