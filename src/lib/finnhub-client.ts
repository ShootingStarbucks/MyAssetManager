import type { FinnhubQuoteResponse } from '@/types/api.types';
import type { NormalizedQuote, HistoricalPrice } from '@/types/asset.types';

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

export async function fetchUsStockHistoricalPrice(
  ticker: string,
  date: string, // "YYYY-MM-DD"
): Promise<HistoricalPrice> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) throw Object.assign(new Error('Missing FINNHUB_API_KEY'), { code: 'NETWORK_ERROR' });

  const fromUnix = Math.floor(new Date(date + 'T00:00:00Z').getTime() / 1000);
  const toUnix = fromUnix + 4 * 86400; // +4 days to cover weekends/holidays

  const url = `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(ticker)}&resolution=D&from=${fromUnix}&to=${toUnix}&token=${apiKey}`;
  const res = await fetch(url);

  if (res.status === 429) throw Object.assign(new Error('Rate limited'), { code: 'RATE_LIMITED' });
  if (!res.ok) throw Object.assign(new Error('Finnhub error'), { code: 'NETWORK_ERROR' });

  const data = await res.json();
  if (data.s === 'no_data' || !data.c || data.c.length === 0) {
    throw Object.assign(new Error('No data'), { code: 'NO_DATA' });
  }

  const actualDate = new Date(data.t[0] * 1000).toISOString().slice(0, 10);
  return { ticker, price: data.c[0], currency: 'USD', date: actualDate };
}
