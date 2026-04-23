export interface HoldingQueryInput {
  ticker: string
  assetType: 'us-stock' | 'kr-stock' | 'crypto'
  name?: string | null
}

const CRYPTO_KR_NAMES: Record<string, string> = {
  BTC: '비트코인',
  ETH: '이더리움',
  BNB: '바이낸스코인',
  SOL: '솔라나',
  XRP: '리플',
  ADA: '에이다',
  DOGE: '도지코인',
  DOT: '폴카닷',
  AVAX: '아발란체',
  MATIC: '폴리곤',
  LINK: '체인링크',
  LTC: '라이트코인',
  UNI: '유니스왑',
  ATOM: '코스모스',
  NEAR: '니어프로토콜',
  APT: '앱토스',
  ARB: '아비트럼',
  OP: '옵티미즘',
  SUI: '수이',
}

export function buildNewsQuery(holding: HoldingQueryInput): string {
  const { ticker, assetType, name } = holding

  if (assetType === 'kr-stock') {
    return name ? `"${name} 주가"` : `"${ticker} 주식"`
  }

  if (assetType === 'us-stock') {
    return name ? `"${name} 주식"` : `"${ticker} 주식"`
  }

  // crypto
  const krName = CRYPTO_KR_NAMES[ticker.toUpperCase()]
  return krName ? `"${krName} 코인"` : `"${ticker} 코인"`
}
