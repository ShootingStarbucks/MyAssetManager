import 'server-only';
import type { PriceProvider } from './price-provider';
import { fetchUsStockQuote } from './finnhub-client';
import { fetchKrStockQuote } from './yahoo-finance-client';
import { fetchCryptoQuotes } from './coingecko-client';
import { prisma } from './prisma';

const FALLBACK_EXCHANGE_RATE = 1380;

export class ApiPriceProvider implements PriceProvider {
  constructor(private readonly userId: string) {}

  async getStockPrice(symbol: string, exchange: string): Promise<number | null> {
    const isKorean =
      exchange === 'KRX' ||
      symbol.endsWith('.KS') ||
      symbol.endsWith('.KQ');

    try {
      if (isKorean) {
        // Strip .KS/.KQ suffix if present — fetchKrStockQuote appends them internally
        const ticker = symbol.replace(/\.(KS|KQ)$/, '');
        const quote = await fetchKrStockQuote(ticker);
        return quote.price;
      } else {
        const quote = await fetchUsStockQuote(symbol);
        return quote.price;
      }
    } catch {
      return null;
    }
  }

  async getCryptoPrice(symbol: string): Promise<number | null> {
    try {
      const quotes = await fetchCryptoQuotes([symbol]);
      return quotes[0]?.price ?? null;
    } catch {
      return null;
    }
  }

  async getExchangeRate(from: string, to: string): Promise<number | null> {
    if (from === 'USD' && to === 'KRW') {
      try {
        const user = await prisma.user.findUnique({
          where: { id: this.userId },
          select: { exchangeRateUSDKRW: true },
        });
        return user?.exchangeRateUSDKRW ?? FALLBACK_EXCHANGE_RATE;
      } catch {
        return FALLBACK_EXCHANGE_RATE;
      }
    }
    return null;
  }
}
