import type { SearchResult } from '@/types/api.types';

const API_KEY = process.env.KRX_API_KEY;
const BASE_URL = 'https://openapi.krx.co.kr/commons/bldServlet/getJsonData.do';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24시간

if (!API_KEY) {
  console.warn('[krx] KRX_API_KEY is not set. 한국 주식 이름 검색은 Yahoo Finance로 폴백됩니다.');
}

interface KrxStockRecord {
  ISU_SRT_CD: string; // 단축코드 (예: "005930")
  ISU_NM: string;     // 종목명 (예: "삼성전자")
}

let stockListCache: { data: SearchResult[]; fetchedAt: number } | null = null;

async function fetchAllStocks(): Promise<SearchResult[]> {
  const markets = [
    'dbms/MDC/STAT/standard/MDCSTAT01901', // KOSPI
    'dbms/MDC/STAT/standard/MDCSTAT01501', // KOSDAQ
  ];

  const allStocks: SearchResult[] = [];

  for (const bld of markets) {
    try {
      const res = await fetch(`${BASE_URL}?bld=${bld}`, {
        headers: { AUTH_KEY: API_KEY! },
      });
      if (!res.ok) continue;

      const data = await res.json();
      const records: KrxStockRecord[] = (data as { OutBlock_1?: KrxStockRecord[] }).OutBlock_1 ?? [];
      for (const r of records) {
        if (r.ISU_SRT_CD && r.ISU_NM) {
          allStocks.push({ ticker: r.ISU_SRT_CD, name: r.ISU_NM });
        }
      }
    } catch {
      // 해당 마켓 fetch 실패 시 건너뜀
    }
  }

  return allStocks;
}

async function getStockList(): Promise<SearchResult[]> {
  const now = Date.now();
  if (stockListCache && now - stockListCache.fetchedAt < CACHE_TTL_MS) {
    return stockListCache.data;
  }

  const data = await fetchAllStocks();
  stockListCache = { data, fetchedAt: now };
  return data;
}

export async function searchKrxStocks(query: string): Promise<SearchResult[]> {
  if (!API_KEY) {
    const { searchKrStocks } = await import('@/lib/yahoo-finance-client');
    return searchKrStocks(query);
  }

  const stocks = await getStockList();
  const q = query.trim().toLowerCase();
  if (!q) return [];

  // 이름 완전일치 > 이름 starts-with > 이름 contains / 코드 starts-with
  const exact: SearchResult[] = [];
  const startsWith: SearchResult[] = [];
  const contains: SearchResult[] = [];

  for (const s of stocks) {
    const name = s.name.toLowerCase();
    if (name === q) {
      exact.push(s);
    } else if (name.startsWith(q) || s.ticker.startsWith(q)) {
      startsWith.push(s);
    } else if (name.includes(q)) {
      contains.push(s);
    }
  }

  return [...exact, ...startsWith, ...contains].slice(0, 8);
}
