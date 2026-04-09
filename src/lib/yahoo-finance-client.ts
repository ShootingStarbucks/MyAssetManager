import yahooFinance from 'yahoo-finance2';
import type { NormalizedQuote } from '@/types/asset.types';

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
