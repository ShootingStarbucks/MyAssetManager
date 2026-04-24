import 'server-only';
import type { FinnhubQuoteResponse, SearchResult } from '@/types/api.types';
import type { NormalizedQuote } from '@/types/asset.types';

const API_KEY = process.env.FINNHUB_API_KEY;

if (!API_KEY) {
  // 빌드 시에는 경고만, 런타임에 실제 에러 발생
  console.warn('[finnhub] FINNHUB_API_KEY is not set.');
}

export async function fetchUsStockQuote(ticker: string): Promise<NormalizedQuote> {
  if (!API_KEY) {
    throw new Error('FINNHUB_API_KEY is not configured. .env.local에 API 키를 추가하세요.');
  }

  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${API_KEY}`;
  const res = await fetch(url, { next: { revalidate: 0 } });

  if (res.status === 429) {
    const err = new Error('Finnhub API 요청 한도 초과');
    (err as NodeJS.ErrnoException).code = 'RATE_LIMITED';
    throw err;
  }

  if (!res.ok) {
    const err = new Error(`Finnhub API 오류: ${res.status}`);
    (err as NodeJS.ErrnoException).code = 'NETWORK_ERROR';
    throw err;
  }

  const data: FinnhubQuoteResponse = await res.json();

  // 유효하지 않은 티커: c=0 이고 pc=0
  if (data.c === 0 && data.pc === 0) {
    const err = new Error(`유효하지 않은 티커: ${ticker}`);
    (err as NodeJS.ErrnoException).code = 'INVALID_TICKER';
    throw err;
  }

  return {
    ticker: ticker.toUpperCase(),
    assetType: 'us-stock',
    price: data.c,
    change: data.d,
    changePercent: data.dp,
    currency: 'USD',
  };
}

export async function searchUsStocks(query: string): Promise<SearchResult[]> {
  if (!API_KEY) return [];

  const url = `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return [];

  const data = await res.json();
  const items: Array<{ symbol: string; description: string; type: string }> = data.result ?? [];

  return items
    .filter((item) => item.type === 'Common Stock')
    .slice(0, 8)
    .map((item) => ({ ticker: item.symbol, name: item.description }));
}

/**
 * Fetch the closing price of a US stock for the nearest trading day
 * at or before targetDate. Looks back up to 7 days to handle weekends/holidays.
 * @param apiKey - Finnhub API key to use
 * @param ticker - e.g. "AAPL"
 * @param targetDate - "YYYY-MM-DD"
 * @returns close price or null if no data available
 */
export async function fetchUsStockHistoricalPrice(
  apiKey: string,
  ticker: string,
  targetDate: string
): Promise<number | null> {
  const to = new Date(targetDate + 'T23:59:59Z');
  const from = new Date(targetDate + 'T00:00:00Z');
  from.setUTCDate(from.getUTCDate() - 7);

  const fromTs = Math.floor(from.getTime() / 1000);
  const toTs = Math.floor(to.getTime() / 1000);

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(ticker)}&resolution=D&from=${fromTs}&to=${toTs}&token=${apiKey}`,
      { cache: 'no-store' }
    );
    if (!res.ok) return null;
    const data: { s: string; c?: number[] } = await res.json();
    if (data.s !== 'ok' || !data.c || data.c.length === 0) return null;
    return data.c[data.c.length - 1] ?? null;
  } catch {
    return null;
  }
}
