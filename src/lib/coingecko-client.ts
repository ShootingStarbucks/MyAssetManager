import type { NormalizedQuote, HistoricalPrice } from '@/types/asset.types';
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

export async function fetchCryptoHistoricalPrice(
  ticker: string,
  date: string, // "YYYY-MM-DD"
): Promise<HistoricalPrice> {
  const coinId = getCoinGeckoId(ticker);
  // CoinGecko expects DD-MM-YYYY
  const [year, month, day] = date.split('-');
  const cgDate = `${day}-${month}-${year}`;

  const url = `https://api.coingecko.com/api/v3/coins/${coinId}/history?date=${cgDate}&localization=false`;
  const res = await fetch(url);

  if (res.status === 429) throw Object.assign(new Error('Rate limited'), { code: 'RATE_LIMITED' });
  if (!res.ok) throw Object.assign(new Error('CoinGecko error'), { code: 'NETWORK_ERROR' });

  const data = await res.json();
  const price = data?.market_data?.current_price?.krw;
  if (price == null) throw Object.assign(new Error('No data'), { code: 'NO_DATA' });

  return { ticker, price, currency: 'KRW', date };
}

function capitalizeCoinId(id: string): string {
  return id
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function searchCrypto(query: string): SearchResult[] {
  const upper = query.toUpperCase();
  return Object.entries(TICKER_TO_COINGECKO_ID)
    .filter(
      ([ticker, id]) =>
        ticker.includes(upper) || id.toUpperCase().includes(upper)
    )
    .slice(0, 8)
    .map(([ticker, id]) => ({ ticker, name: capitalizeCoinId(id) }));
}
