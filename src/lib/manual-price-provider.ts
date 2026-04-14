import 'server-only';
import type { PriceProvider } from './price-provider';
import { prisma } from './prisma';

export class ManualPriceProvider implements PriceProvider {
  constructor(private readonly userId: string) {}

  async getStockPrice(symbol: string, _exchange: string): Promise<number | null> {
    try {
      // Strip .KS/.KQ suffix to match stored ticker
      const ticker = symbol.replace(/\.(KS|KQ)$/, '').toUpperCase();
      const holding = await prisma.holding.findUnique({
        where: { userId_ticker: { userId: this.userId, ticker } },
        select: { currentPrice: true },
      });
      return holding?.currentPrice ?? null;
    } catch {
      return null;
    }
  }

  async getCryptoPrice(symbol: string): Promise<number | null> {
    try {
      const ticker = symbol.toUpperCase();
      const holding = await prisma.holding.findUnique({
        where: { userId_ticker: { userId: this.userId, ticker } },
        select: { currentPrice: true },
      });
      return holding?.currentPrice ?? null;
    } catch {
      return null;
    }
  }

  async getExchangeRate(_from: string, _to: string): Promise<number | null> {
    return null;
  }
}
