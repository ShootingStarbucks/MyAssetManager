/**
 * 주요 한국 ETF 종목명 → 티커 코드 매핑 테이블
 * KODEX / TIGER / KINDEX / ARIRANG / ACE / SOL / HANARO 시리즈 주요 ETF
 */
export interface KrEtfEntry {
  ticker: string;
  name: string;
}

export const KR_ETF_LIST: KrEtfEntry[] = [
  // ─── 국내 지수 ───────────────────────────────────────────
  { ticker: '069500', name: 'KODEX 200' },
  { ticker: '102110', name: 'TIGER 200' },
  { ticker: '278540', name: 'KODEX MSCI Korea TR' },
  { ticker: '229200', name: 'KODEX 코스닥150' },
  { ticker: '232080', name: 'TIGER 코스닥150' },
  { ticker: '153130', name: 'KODEX 단기채권' },
  { ticker: '182490', name: 'TIGER 단기통안채' },
  { ticker: '114260', name: 'KODEX 국고채3년' },
  { ticker: '114820', name: 'TIGER 국채3년' },

  // ─── 미국·글로벌 지수 ─────────────────────────────────────
  { ticker: '360750', name: 'TIGER 미국S&P500' },
  { ticker: '379800', name: 'KODEX 미국S&P500TR' },
  { ticker: '444600', name: 'SOL 미국S&P500' },
  { ticker: '480040', name: 'ACE 미국S&P500' },
  { ticker: '446720', name: 'TIGER 미국S&P500+12%프리미엄' },
  { ticker: '133690', name: 'TIGER 미국나스닥100' },
  { ticker: '379810', name: 'KODEX 미국나스닥100TR' },
  { ticker: '168580', name: 'KINDEX 미국나스닥100' },
  { ticker: '304940', name: 'KODEX 미국나스닥100TR(H)' },
  { ticker: '381170', name: 'TIGER 미국테크TOP10 INDXX' },
  { ticker: '453810', name: 'KODEX 미국빅테크TOP10 INDXX' },
  { ticker: '460450', name: 'TIGER 미국필라델피아반도체나스닥' },
  { ticker: '195930', name: 'KODEX 선진국MSCI World' },
  { ticker: '251350', name: 'KODEX 선진국MSCI World' },
  { ticker: '195980', name: 'TIGER 선진국MSCI(합성)' },

  // ─── 미국 채권 ────────────────────────────────────────────
  { ticker: '305080', name: 'TIGER 미국채10년선물' },
  { ticker: '308620', name: 'KODEX 미국채10년선물' },
  { ticker: '448290', name: 'KODEX 미국30년국채+12%프리미엄' },

  // ─── 레버리지 / 인버스 ────────────────────────────────────
  { ticker: '122630', name: 'KODEX 레버리지' },
  { ticker: '123320', name: 'TIGER 레버리지' },
  { ticker: '114800', name: 'KODEX 인버스' },
  { ticker: '120150', name: 'TIGER 인버스' },
  { ticker: '252670', name: 'KODEX 200선물인버스2X' },
  { ticker: '233740', name: 'KODEX 코스닥150레버리지' },

  // ─── 섹터 ─────────────────────────────────────────────────
  { ticker: '091160', name: 'KODEX 반도체' },
  { ticker: '091230', name: 'TIGER 반도체' },
  { ticker: '139220', name: 'TIGER 200IT' },
  { ticker: '244580', name: 'KODEX 바이오' },
  { ticker: '143860', name: 'TIGER 헬스케어' },
  { ticker: '305540', name: 'TIGER 2차전지TOP10' },
  { ticker: '305720', name: 'KODEX 2차전지산업' },

  // ─── 배당 ─────────────────────────────────────────────────
  { ticker: '161510', name: 'TIGER 고배당' },
  { ticker: '211560', name: 'KODEX 배당성장' },
  { ticker: '189400', name: 'TIGER 부동산인프라고배당' },

  // ─── 원자재·통화 ──────────────────────────────────────────
  { ticker: '132030', name: 'KODEX 금선물(H)' },
  { ticker: '175900', name: 'TIGER 금은선물(H)' },
  { ticker: '130680', name: 'TIGER 원자재선물(H)' },

  // ─── 해외 (중국 등) ───────────────────────────────────────
  { ticker: '329200', name: 'TIGER 차이나CSI300' },
];

export function searchKrEtfsByName(query: string): KrEtfEntry[] {
  const q = query.trim().toLowerCase().replace(/\s+/g, '');
  if (!q) return [];

  const exact: KrEtfEntry[] = [];
  const startsWith: KrEtfEntry[] = [];
  const contains: KrEtfEntry[] = [];

  for (const e of KR_ETF_LIST) {
    const name = e.name.toLowerCase().replace(/\s+/g, '');
    const ticker = e.ticker.toLowerCase();
    if (name === q || ticker === q) {
      exact.push(e);
    } else if (name.startsWith(q) || ticker.startsWith(q)) {
      startsWith.push(e);
    } else if (name.includes(q) || ticker.includes(q)) {
      contains.push(e);
    }
  }

  const seen = new Set<string>();
  const deduped: KrEtfEntry[] = [];
  for (const e of [...exact, ...startsWith, ...contains]) {
    if (!seen.has(e.ticker)) {
      seen.add(e.ticker);
      deduped.push(e);
    }
  }

  return deduped.slice(0, 8);
}
