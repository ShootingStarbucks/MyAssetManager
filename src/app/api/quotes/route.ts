import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { fetchUsStockQuote } from '@/lib/finnhub-client';
import { fetchKrStockQuote } from '@/lib/yahoo-finance-client';
import { fetchCryptoQuotes } from '@/lib/coingecko-client';
import type { QuoteResult } from '@/types/asset.types';
import type { ApiError } from '@/types/api.types';

const requestSchema = z.object({
  holdings: z.array(
    z.object({
      ticker: z.string().min(1).max(20),
      assetType: z.enum(['us-stock', 'kr-stock', 'crypto']),
    })
  ),
});

type HoldingItem = z.infer<typeof requestSchema>['holdings'][number];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } satisfies ApiError },
      { status: 401 }
    );
  }

  const body = await req.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: '잘못된 요청입니다' } satisfies ApiError },
      { status: 400 }
    );
  }

  const { holdings } = parsed.data;

  const usStocks = holdings.filter((h: HoldingItem) => h.assetType === 'us-stock');
  const krStocks = holdings.filter((h: HoldingItem) => h.assetType === 'kr-stock');
  const cryptos = holdings.filter((h: HoldingItem) => h.assetType === 'crypto');

  const results: QuoteResult[] = [];

  // 미국 주식: 개별 병렬 요청
  const usResults = await Promise.allSettled(
    usStocks.map((h: HoldingItem) => fetchUsStockQuote(h.ticker))
  );
  usStocks.forEach((h: HoldingItem, i: number) => {
    const result = usResults[i];
    if (result.status === 'fulfilled') {
      results.push({ ticker: h.ticker, quote: result.value });
    } else {
      const code = (result.reason as NodeJS.ErrnoException).code;
      results.push({
        ticker: h.ticker,
        quote: null,
        error: (code as QuoteResult['error']) ?? 'NETWORK_ERROR',
      });
    }
  });

  // 한국 주식: 개별 병렬 요청
  const krResults = await Promise.allSettled(
    krStocks.map((h: HoldingItem) => fetchKrStockQuote(h.ticker))
  );
  krStocks.forEach((h: HoldingItem, i: number) => {
    const result = krResults[i];
    if (result.status === 'fulfilled') {
      results.push({ ticker: h.ticker, quote: result.value });
    } else {
      const code = (result.reason as NodeJS.ErrnoException).code;
      results.push({
        ticker: h.ticker,
        quote: null,
        error: (code as QuoteResult['error']) ?? 'NETWORK_ERROR',
      });
    }
  });

  // 암호화폐: 배치 요청
  if (cryptos.length > 0) {
    try {
      const cryptoQuotes = await fetchCryptoQuotes(cryptos.map((h: HoldingItem) => h.ticker));
      cryptoQuotes.forEach((q) => {
        results.push({ ticker: q.ticker, quote: q });
      });
    } catch (e) {
      cryptos.forEach((h: HoldingItem) => {
        const code = (e as NodeJS.ErrnoException).code;
        results.push({
          ticker: h.ticker,
          quote: null,
          error: (code as QuoteResult['error']) ?? 'NETWORK_ERROR',
        });
      });
    }
  }

  return NextResponse.json({ results });
}
