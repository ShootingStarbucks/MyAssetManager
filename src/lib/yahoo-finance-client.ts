import 'server-only';
import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();
import type { NormalizedQuote } from '@/types/asset.types';
import type { SearchResult } from '@/types/api.types';

interface HistoricalRow {
  date: Date;
  close: number;
  [key: string]: unknown;
}

export async function fetchKrStockQuote(ticker: string): Promise<NormalizedQuote> {
  // 한국 주식: 종목코드 6자리 → .KS (KOSPI) 또는 .KQ (KOSDAQ) 시도
  const symbols = [`${ticker}.KS`, `${ticker}.KQ`];

  let lastError: Error | null = null;

  for (const symbol of symbols) {
    try {
      const quote = await yahooFinance.quote(symbol);

      // regularMarketPrice가 없으면 다음 심볼 시도
      const price = (quote as Record<string, unknown>).regularMarketPrice as number | undefined;
      if (price == null) continue;

      const prevClose = ((quote as Record<string, unknown>).regularMarketPreviousClose as number | undefined) ?? price;
      const change = price - prevClose;
      const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;
      const name = ((quote as Record<string, unknown>).longName as string | undefined)
        ?? ((quote as Record<string, unknown>).shortName as string | undefined);

      return {
        ticker: ticker.toUpperCase(),
        assetType: 'kr-stock',
        price,
        change,
        changePercent,
        currency: 'KRW',
        ...(name ? { name } : {}),
      };
    } catch (e) {
      lastError = e as Error;
    }
  }

  const err = new Error(`유효하지 않은 한국 주식 종목코드: ${ticker}`);
  (err as NodeJS.ErrnoException).code = 'INVALID_TICKER';
  throw lastError ?? err;
}

export async function searchKrStocks(query: string): Promise<SearchResult[]> {
  try {
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0&lang=ko-KR&region=KR`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!res.ok) return [];

    const data = await res.json();
    const quotes: Array<{ symbol?: string; shortname?: string; longname?: string }> =
      data.quotes ?? [];

    return quotes
      .filter((q) => q.symbol && (q.symbol.endsWith('.KS') || q.symbol.endsWith('.KQ')))
      .slice(0, 8)
      .map((q) => ({
        ticker: q.symbol!.replace(/\.(KS|KQ)$/, ''),
        name: q.shortname ?? q.longname ?? q.symbol!,
      }));
  } catch {
    return [];
  }
}
