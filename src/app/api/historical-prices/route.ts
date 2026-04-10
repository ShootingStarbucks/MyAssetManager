import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { fetchUsStockHistoricalPrice } from '@/lib/finnhub-client';
import { fetchKrStockHistoricalPrice } from '@/lib/yahoo-finance-client';
import { fetchCryptoHistoricalPrice } from '@/lib/coingecko-client';
import type { HistoricalPriceResult } from '@/types/asset.types';
import type { ApiError } from '@/types/api.types';

const requestSchema = z.object({
  items: z
    .array(
      z.object({
        ticker: z.string().min(1).max(20),
        assetType: z.enum(['us-stock', 'kr-stock', 'crypto']),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
    )
    .min(1)
    .max(20),
});

type RequestItem = z.infer<typeof requestSchema>['items'][number];

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

  const { items } = parsed.data;

  const usStocks = items.filter((i: RequestItem) => i.assetType === 'us-stock');
  const krStocks = items.filter((i: RequestItem) => i.assetType === 'kr-stock');
  const cryptos = items.filter((i: RequestItem) => i.assetType === 'crypto');

  const results: HistoricalPriceResult[] = [];

  const usResults = await Promise.allSettled(
    usStocks.map((i: RequestItem) => fetchUsStockHistoricalPrice(i.ticker, i.date))
  );
  usStocks.forEach((i: RequestItem, idx: number) => {
    const r = usResults[idx];
    if (r.status === 'fulfilled') {
      results.push({ ticker: i.ticker, price: r.value.price, currency: r.value.currency, date: r.value.date });
    } else {
      const code = (r.reason as NodeJS.ErrnoException).code;
      results.push({ ticker: i.ticker, price: null, currency: null, date: null, error: (code as HistoricalPriceResult['error']) ?? 'NETWORK_ERROR' });
    }
  });

  const krResults = await Promise.allSettled(
    krStocks.map((i: RequestItem) => fetchKrStockHistoricalPrice(i.ticker, i.date))
  );
  krStocks.forEach((i: RequestItem, idx: number) => {
    const r = krResults[idx];
    if (r.status === 'fulfilled') {
      results.push({ ticker: i.ticker, price: r.value.price, currency: r.value.currency, date: r.value.date });
    } else {
      const code = (r.reason as NodeJS.ErrnoException).code;
      results.push({ ticker: i.ticker, price: null, currency: null, date: null, error: (code as HistoricalPriceResult['error']) ?? 'NETWORK_ERROR' });
    }
  });

  const cryptoResults = await Promise.allSettled(
    cryptos.map((i: RequestItem) => fetchCryptoHistoricalPrice(i.ticker, i.date))
  );
  cryptos.forEach((i: RequestItem, idx: number) => {
    const r = cryptoResults[idx];
    if (r.status === 'fulfilled') {
      results.push({ ticker: i.ticker, price: r.value.price, currency: r.value.currency, date: r.value.date });
    } else {
      const code = (r.reason as NodeJS.ErrnoException).code;
      results.push({ ticker: i.ticker, price: null, currency: null, date: null, error: (code as HistoricalPriceResult['error']) ?? 'NETWORK_ERROR' });
    }
  });

  return NextResponse.json({ results });
}
