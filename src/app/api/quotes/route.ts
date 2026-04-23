import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { rateLimit, getClientIp, rateLimitExceededResponse } from '@/lib/rate-limit';

// 1분당 10회
const QUOTES_LIMIT = { windowMs: 60 * 1000, max: 10 };
import { fetchUsStockQuote } from '@/lib/finnhub-client';
import { fetchKrStockQuote } from '@/lib/yahoo-finance-client';
import { fetchCryptoQuotes } from '@/lib/coingecko-client';
import { getCached, getOrFetch } from '@/lib/quote-cache';
import type { QuoteResult } from '@/types/asset.types';
import type { ApiError } from '@/types/api.types';

const requestSchema = z.object({
  holdings: z.array(
    z.object({
      ticker: z.string().min(1).max(20),
      assetType: z.enum(['us-stock', 'kr-stock', 'crypto']),
    })
  ).max(20),
});

type HoldingItem = z.infer<typeof requestSchema>['holdings'][number];

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const limit = rateLimit(`quotes:${ip}`, QUOTES_LIMIT);
  if (!limit.success) {
    return NextResponse.json(rateLimitExceededResponse(), {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil(limit.retryAfterMs / 1000)) },
    });
  }

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

  // 미국 주식: 캐시 우선, 미스 시 Finnhub 호출 (in-flight 중복 제거)
  const usResults = await Promise.allSettled(
    usStocks.map((h: HoldingItem) =>
      getOrFetch(`${h.ticker}:us-stock`, () => fetchUsStockQuote(h.ticker))
    )
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

  // 한국 주식: 캐시 우선, 미스 시 Yahoo Finance 호출
  const krResults = await Promise.allSettled(
    krStocks.map((h: HoldingItem) =>
      getOrFetch(`${h.ticker}:kr-stock`, () => fetchKrStockQuote(h.ticker))
    )
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

  // 암호화폐: 캐시 히트 분리 후 미스된 것만 단일 배치 요청
  if (cryptos.length > 0) {
    const missedTickers: string[] = [];
    for (const h of cryptos) {
      const hit = getCached(`${h.ticker}:crypto`);
      if (hit) {
        results.push({ ticker: h.ticker, quote: hit });
      } else {
        missedTickers.push(h.ticker);
      }
    }

    if (missedTickers.length > 0) {
      // 요청 범위 내 배치 Promise 공유 — 미스된 티커를 한 번만 CoinGecko에 요청
      let batchPromise: Promise<import('@/types/asset.types').NormalizedQuote[]> | null = null;

      const missedResults = await Promise.allSettled(
        missedTickers.map((ticker) =>
          getOrFetch(`${ticker}:crypto`, () => {
            if (!batchPromise) batchPromise = fetchCryptoQuotes(missedTickers);
            return batchPromise.then((quotes) => {
              const found = quotes.find(
                (q) => q.ticker.toUpperCase() === ticker.toUpperCase()
              );
              if (!found) {
                const err = new Error(`Invalid coin: ${ticker}`);
                (err as NodeJS.ErrnoException).code = 'INVALID_TICKER';
                throw err;
              }
              return found;
            });
          })
        )
      );

      missedTickers.forEach((ticker, i) => {
        const result = missedResults[i];
        if (result.status === 'fulfilled') {
          results.push({ ticker, quote: result.value });
        } else {
          const code = (result.reason as NodeJS.ErrnoException).code;
          results.push({
            ticker,
            quote: null,
            error: (code as QuoteResult['error']) ?? 'NETWORK_ERROR',
          });
        }
      });
    }
  }

  return NextResponse.json({ results });
}
