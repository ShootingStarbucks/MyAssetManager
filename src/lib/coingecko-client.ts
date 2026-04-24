import 'server-only';
import type { NormalizedQuote } from '@/types/asset.types';
import type { SearchResult } from '@/types/api.types';

// BTC → bitcoin 등 CoinGecko ID 매핑 (주요 코인)
const TICKER_TO_COINGECKO_ID: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  BNB: 'binancecoin',
  SOL: 'solana',
  XRP: 'ripple',
  USDT: 'tether',
  USDC: 'usd-coin',
  ADA: 'cardano',
  DOGE: 'dogecoin',
  MATIC: 'matic-network',
  DOT: 'polkadot',
  LTC: 'litecoin',
  LINK: 'chainlink',
  AVAX: 'avalanche-2',
  UNI: 'uniswap',
  ATOM: 'cosmos',
  XLM: 'stellar',
  ALGO: 'algorand',
  NEAR: 'near',
  APT: 'aptos',
  ARB: 'arbitrum',
  OP: 'optimism',
  SUI: 'sui',
};

export function getCoinGeckoId(ticker: string): string {
  const upper = ticker.toUpperCase();
  return TICKER_TO_COINGECKO_ID[upper] ?? ticker.toLowerCase();
}

export async function fetchCryptoQuotes(tickers: string[]): Promise<NormalizedQuote[]> {
  const ids = tickers.map(getCoinGeckoId).join(',');
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=krw&include_24hr_change=true`;

  const res = await fetch(url, { next: { revalidate: 0 } });

  if (res.status === 429) {
    const err = new Error('CoinGecko API 요청 한도 초과');
    (err as NodeJS.ErrnoException).code = 'RATE_LIMITED';
    throw err;
  }

  if (!res.ok) {
    const err = new Error(`CoinGecko API 오류: ${res.status}`);
    (err as NodeJS.ErrnoException).code = 'NETWORK_ERROR';
    throw err;
  }

  const data: Record<string, { krw: number; krw_24h_change: number }> = await res.json();

  return tickers.map((ticker) => {
    const id = getCoinGeckoId(ticker);
    const coinData = data[id];

    if (!coinData) {
      const err = new Error(`유효하지 않은 코인: ${ticker}`);
      (err as NodeJS.ErrnoException).code = 'INVALID_TICKER';
      throw err;
    }

    const price = coinData.krw;
    const changePercent = coinData.krw_24h_change ?? 0;
    const change = (price / (1 + changePercent / 100)) * (changePercent / 100);

    return {
      ticker: ticker.toUpperCase(),
      assetType: 'crypto' as const,
      price,
      change,
      changePercent,
      currency: 'KRW' as const,
    };
  });
}

export async function searchCrypto(query: string): Promise<SearchResult[]> {
  const url = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) return [];

  const data = await res.json();
  const coins: Array<{ id: string; name: string; symbol: string; market_cap_rank: number | null }> =
    data.coins ?? [];

  return coins
    .sort((a, b) => (a.market_cap_rank ?? 99999) - (b.market_cap_rank ?? 99999))
    .slice(0, 8)
    .map((c) => ({ ticker: c.symbol.toUpperCase(), name: c.name }));
}

/**
 * Fetch the KRW price of a cryptocurrency on the given date.
 * CoinGecko history API format is "DD-MM-YYYY".
 * @param ticker - crypto ticker symbol, e.g. "BTC"
 * @param targetDate - "YYYY-MM-DD"
 * @returns price in KRW or null if unavailable
 */
export async function fetchCryptoHistoricalPrice(
  ticker: string,
  targetDate: string
): Promise<number | null> {
  // Convert YYYY-MM-DD to DD-MM-YYYY for CoinGecko
  const [year, month, day] = targetDate.split('-');
  const cgDate = `${day}-${month}-${year}`;

  // Get the CoinGecko coin ID using the existing mapping/helper
  const coinId = getCoinGeckoId(ticker);

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinId}/history?date=${cgDate}&localization=false`,
      { cache: 'no-store' }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return (data as any)?.market_data?.current_price?.krw ?? null;
  } catch {
    return null;
  }
}
