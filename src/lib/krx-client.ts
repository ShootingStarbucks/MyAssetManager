import type { SearchResult } from '@/types/api.types';
import { searchKrStocksByName } from '@/lib/kr-stock-names';

const API_KEY = process.env.KRX_API_KEY;
const BASE_URL = 'https://openapi.krx.co.kr/commons/bldServlet/getJsonData.do';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24시간

if (!API_KEY) {
  console.warn('[krx] KRX_API_KEY is not set. 한국 주식 이름 검색은 내장 목록으로 폴백됩니다.');
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
    } catch (err) {
      console.error(`[krx] Failed to fetch market ${bld}:`, err);
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
  const q = query.trim();
  if (!q) return [];

  // KRX API 사용 가능한 경우 시도
  if (API_KEY) {
    const stocks = await getStockList();
    if (stocks.length > 0) {
      const lower = q.toLowerCase();
      const exact: SearchResult[] = [];
      const startsWith: SearchResult[] = [];
      const contains: SearchResult[] = [];

      for (const s of stocks) {
        const name = s.name.toLowerCase();
        if (name === lower) {
          exact.push(s);
        } else if (name.startsWith(lower) || s.ticker.startsWith(lower)) {
          startsWith.push(s);
        } else if (name.includes(lower)) {
          contains.push(s);
        }
      }

      const results = [...exact, ...startsWith, ...contains].slice(0, 8);
      if (results.length > 0) return results;
    } else {
      console.warn('[krx] KRX API가 빈 목록을 반환했습니다. 내장 종목 목록으로 폴백합니다.');
    }
  }

  // 내장 한국 종목 목록으로 폴백 (KRX API 미설정 또는 실패 시)
  const localResults = searchKrStocksByName(q);
  if (localResults.length > 0) {
    return localResults.map((s) => ({ ticker: s.ticker, name: s.name }));
  }

  // 티커 코드 형식(숫자)이 아닌 경우 Yahoo Finance로 추가 시도
  if (!/^\d/.test(q)) {
    try {
      const { searchKrStocks } = await import('@/lib/yahoo-finance-client');
      return searchKrStocks(q);
    } catch {
      // Yahoo Finance 실패 시 무시
    }
  }

  return [];
}
