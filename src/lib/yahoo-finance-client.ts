import yahooFinance from 'yahoo-finance2';
import type { NormalizedQuote, HistoricalPrice } from '@/types/asset.types';
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

      return {
        ticker: ticker.toUpperCase(),
        assetType: 'kr-stock',
        price,
        change,
        changePercent,
        currency: 'KRW',
      };
    } catch (e) {
      lastError = e as Error;
    }
  }

  const err = new Error(`유효하지 않은 한국 주식 종목코드: ${ticker}`);
  (err as NodeJS.ErrnoException).code = 'INVALID_TICKER';
  throw lastError ?? err;
}

export async function fetchKrStockHistoricalPrice(
  ticker: string,
  date: string, // "YYYY-MM-DD"
): Promise<HistoricalPrice> {
  const period1 = new Date(date + 'T00:00:00Z');
  const period2 = new Date(period1.getTime() + 4 * 86400 * 1000); // +4 days

  const suffixes = ['.KS', '.KQ'];
  for (const suffix of suffixes) {
    try {
      const symbol = `${ticker}${suffix}`;
      const result = await (yahooFinance as unknown as { historical: (symbol: string, opts: object) => Promise<HistoricalRow[]> }).historical(symbol, {
        period1,
        period2,
        interval: '1d',
        events: 'history',
      });
      if (result.length > 0 && result[0].close != null) {
        const actualDate = result[0].date.toISOString().slice(0, 10);
        return { ticker, price: result[0].close, currency: 'KRW', date: actualDate };
      }
    } catch {
      // try next suffix
    }
  }
  throw Object.assign(new Error('No historical data'), { code: 'NO_DATA' });
}

export async function searchKrStocks(query: string): Promise<SearchResult[]> {
  try {
    const result = await (yahooFinance as unknown as {
      search: (q: string) => Promise<{ quotes: Array<{ symbol?: string; shortname?: string; longname?: string }> }>;
    }).search(query);

    return (result.quotes ?? [])
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
