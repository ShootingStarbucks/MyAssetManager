/**
 * 주요 한국 주식 종목명 → 티커 코드 매핑 테이블
 * KOSPI / KOSDAQ 시가총액 상위 종목 포함
 */
export interface KrStockEntry {
  ticker: string;
  name: string;
  market: 'KOSPI' | 'KOSDAQ';
}

export const KR_STOCK_LIST: KrStockEntry[] = [
  // KOSPI 주요 종목
  { ticker: '005930', name: '삼성전자', market: 'KOSPI' },
  { ticker: '000660', name: 'SK하이닉스', market: 'KOSPI' },
  { ticker: '373220', name: 'LG에너지솔루션', market: 'KOSPI' },
  { ticker: '207940', name: '삼성바이오로직스', market: 'KOSPI' },
  { ticker: '005380', name: '현대차', market: 'KOSPI' },
  { ticker: '000270', name: '기아', market: 'KOSPI' },
  { ticker: '005490', name: 'POSCO홀딩스', market: 'KOSPI' },
  { ticker: '006400', name: '삼성SDI', market: 'KOSPI' },
  { ticker: '051910', name: 'LG화학', market: 'KOSPI' },
  { ticker: '035420', name: 'NAVER', market: 'KOSPI' },
  { ticker: '035720', name: '카카오', market: 'KOSPI' },
  { ticker: '068270', name: '셀트리온', market: 'KOSPI' },
  { ticker: '105560', name: 'KB금융', market: 'KOSPI' },
  { ticker: '055550', name: '신한지주', market: 'KOSPI' },
  { ticker: '028260', name: '삼성물산', market: 'KOSPI' },
  { ticker: '012330', name: '현대모비스', market: 'KOSPI' },
  { ticker: '086790', name: '하나금융지주', market: 'KOSPI' },
  { ticker: '316140', name: '우리금융지주', market: 'KOSPI' },
  { ticker: '017670', name: 'SK텔레콤', market: 'KOSPI' },
  { ticker: '030200', name: 'KT', market: 'KOSPI' },
  { ticker: '066570', name: 'LG전자', market: 'KOSPI' },
  { ticker: '003550', name: 'LG', market: 'KOSPI' },
  { ticker: '034730', name: 'SK', market: 'KOSPI' },
  { ticker: '096770', name: 'SK이노베이션', market: 'KOSPI' },
  { ticker: '015760', name: '한국전력', market: 'KOSPI' },
  { ticker: '032830', name: '삼성생명', market: 'KOSPI' },
  { ticker: '000810', name: '삼성화재', market: 'KOSPI' },
  { ticker: '009150', name: '삼성전기', market: 'KOSPI' },
  { ticker: '010140', name: '삼성중공업', market: 'KOSPI' },
  { ticker: '018260', name: '삼성에스디에스', market: 'KOSPI' },
  { ticker: '004020', name: '현대제철', market: 'KOSPI' },
  { ticker: '033780', name: 'KT&G', market: 'KOSPI' },
  { ticker: '010950', name: 'S-Oil', market: 'KOSPI' },
  { ticker: '010950', name: '에스오일', market: 'KOSPI' },
  { ticker: '012450', name: '한화에어로스페이스', market: 'KOSPI' },
  { ticker: '011070', name: 'LG이노텍', market: 'KOSPI' },
  { ticker: '267250', name: 'HD현대', market: 'KOSPI' },
  { ticker: '329180', name: 'HD현대중공업', market: 'KOSPI' },
  { ticker: '009540', name: '한국조선해양', market: 'KOSPI' },
  { ticker: '000720', name: '현대건설', market: 'KOSPI' },
  { ticker: '003490', name: '대한항공', market: 'KOSPI' },
  { ticker: '078930', name: 'GS', market: 'KOSPI' },
  { ticker: '011170', name: '롯데케미칼', market: 'KOSPI' },
  { ticker: '023530', name: '롯데쇼핑', market: 'KOSPI' },
  { ticker: '034020', name: '두산에너빌리티', market: 'KOSPI' },
  { ticker: '090430', name: '아모레퍼시픽', market: 'KOSPI' },
  { ticker: '138040', name: '메리츠금융지주', market: 'KOSPI' },
  { ticker: '021240', name: '코웨이', market: 'KOSPI' },
  { ticker: '010130', name: '고려아연', market: 'KOSPI' },
  { ticker: '018880', name: '한온시스템', market: 'KOSPI' },
  { ticker: '001040', name: 'CJ', market: 'KOSPI' },
  { ticker: '097950', name: 'CJ제일제당', market: 'KOSPI' },
  { ticker: '000100', name: '유한양행', market: 'KOSPI' },
  { ticker: '128940', name: '한미약품', market: 'KOSPI' },
  { ticker: '185750', name: '종근당', market: 'KOSPI' },
  { ticker: '002380', name: 'KCC', market: 'KOSPI' },
  { ticker: '003670', name: '포스코퓨처엠', market: 'KOSPI' },
  { ticker: '271560', name: '오리온', market: 'KOSPI' },
  { ticker: '352820', name: '하이브', market: 'KOSPI' },
  { ticker: '004370', name: '농심', market: 'KOSPI' },
  { ticker: '000080', name: '하이트진로', market: 'KOSPI' },
  { ticker: '051900', name: 'LG생활건강', market: 'KOSPI' },
  { ticker: '024110', name: '기업은행', market: 'KOSPI' },
  { ticker: '139480', name: '이마트', market: 'KOSPI' },
  { ticker: '282330', name: 'BGF리테일', market: 'KOSPI' },
  { ticker: '069960', name: '현대백화점', market: 'KOSPI' },
  { ticker: '006360', name: 'GS건설', market: 'KOSPI' },
  { ticker: '047040', name: '대우건설', market: 'KOSPI' },
  { ticker: '000150', name: '두산', market: 'KOSPI' },
  { ticker: '241560', name: '두산밥캣', market: 'KOSPI' },
  { ticker: '002790', name: '아모레G', market: 'KOSPI' },
  { ticker: '161390', name: '한국타이어앤테크놀로지', market: 'KOSPI' },
  { ticker: '025980', name: '에코마케팅', market: 'KOSPI' },
  { ticker: '259960', name: '크래프톤', market: 'KOSPI' },
  { ticker: '302440', name: 'SK바이오사이언스', market: 'KOSPI' },
  { ticker: '323410', name: '카카오뱅크', market: 'KOSPI' },
  { ticker: '377300', name: '카카오페이', market: 'KOSPI' },
  { ticker: '192820', name: '코스맥스', market: 'KOSPI' },
  { ticker: '011780', name: '금호석유', market: 'KOSPI' },
  { ticker: '009830', name: '한화솔루션', market: 'KOSPI' },
  { ticker: '000990', name: 'DB하이텍', market: 'KOSPI' },
  { ticker: '014820', name: '동원시스템즈', market: 'KOSPI' },
  { ticker: '004800', name: '효성', market: 'KOSPI' },
  { ticker: '298040', name: '효성중공업', market: 'KOSPI' },
  { ticker: '298000', name: '효성티앤씨', market: 'KOSPI' },
  { ticker: '298050', name: '효성첨단소재', market: 'KOSPI' },
  { ticker: '036460', name: '한국가스공사', market: 'KOSPI' },
  { ticker: '011200', name: 'HMM', market: 'KOSPI' },
  { ticker: '020150', name: '롯데에너지머티리얼즈', market: 'KOSPI' },
  { ticker: '003230', name: '삼양식품', market: 'KOSPI' },
  { ticker: '007070', name: 'GS리테일', market: 'KOSPI' },
  { ticker: '030000', name: '제일기획', market: 'KOSPI' },
  { ticker: '316140', name: '우리금융지주', market: 'KOSPI' },
  { ticker: '005940', name: 'NH투자증권', market: 'KOSPI' },
  { ticker: '071050', name: '한국금융지주', market: 'KOSPI' },
  { ticker: '006800', name: '미래에셋증권', market: 'KOSPI' },
  { ticker: '016360', name: '삼성증권', market: 'KOSPI' },

  // KOSDAQ 주요 종목
  { ticker: '086520', name: '에코프로', market: 'KOSDAQ' },
  { ticker: '247540', name: '에코프로비엠', market: 'KOSDAQ' },
  { ticker: '091990', name: '셀트리온헬스케어', market: 'KOSDAQ' },
  { ticker: '036570', name: '엔씨소프트', market: 'KOSDAQ' },
  { ticker: '251270', name: '넷마블', market: 'KOSDAQ' },
  { ticker: '263750', name: '펄어비스', market: 'KOSDAQ' },
  { ticker: '145020', name: '휴젤', market: 'KOSDAQ' },
  { ticker: '058470', name: '리노공업', market: 'KOSDAQ' },
  { ticker: '357780', name: '솔브레인', market: 'KOSDAQ' },
  { ticker: '240810', name: '원익IPS', market: 'KOSDAQ' },
  { ticker: '096530', name: '씨젠', market: 'KOSDAQ' },
  { ticker: '041510', name: 'SM엔터테인먼트', market: 'KOSDAQ' },
  { ticker: '035900', name: 'JYP엔터테인먼트', market: 'KOSDAQ' },
  { ticker: '122870', name: '와이지엔터테인먼트', market: 'KOSDAQ' },
  { ticker: '293490', name: '카카오게임즈', market: 'KOSDAQ' },
  { ticker: '259630', name: '엠게임', market: 'KOSDAQ' },
  { ticker: '112040', name: '위메이드', market: 'KOSDAQ' },
  { ticker: '095660', name: '네오위즈', market: 'KOSDAQ' },
  { ticker: '111770', name: '영원무역', market: 'KOSDAQ' },
  { ticker: '214150', name: '클래시스', market: 'KOSDAQ' },
  { ticker: '196170', name: '알테오젠', market: 'KOSDAQ' },
  { ticker: '085660', name: '차바이오텍', market: 'KOSDAQ' },
  { ticker: '141080', name: '레고켐바이오', market: 'KOSDAQ' },
  { ticker: '226330', name: '신테카바이오', market: 'KOSDAQ' },
  { ticker: '950130', name: '엑스페릭스', market: 'KOSDAQ' },
  { ticker: '039030', name: '이오테크닉스', market: 'KOSDAQ' },
  { ticker: '042700', name: '한미반도체', market: 'KOSDAQ' },
  { ticker: '060540', name: '에스아이에스', market: 'KOSDAQ' },
  { ticker: '131970', name: '두산테스나', market: 'KOSDAQ' },
  { ticker: '065350', name: '신성이엔지', market: 'KOSDAQ' },
  { ticker: '403870', name: 'HPSP', market: 'KOSDAQ' },
  { ticker: '222080', name: '씨아이에스', market: 'KOSDAQ' },
  { ticker: '039560', name: '다산네트웍스', market: 'KOSDAQ' },
  { ticker: '066700', name: '테라젠이텍스', market: 'KOSDAQ' },
  { ticker: '352480', name: '씨앤씨인터내셔널', market: 'KOSDAQ' },
  { ticker: '950160', name: '코오롱티슈진', market: 'KOSDAQ' },
  { ticker: '455250', name: '에코프로머티리얼즈', market: 'KOSDAQ' },
];

/**
 * 한국어 종목명 또는 티커 코드로 검색
 */
export function searchKrStocksByName(query: string): KrStockEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const exact: KrStockEntry[] = [];
  const startsWith: KrStockEntry[] = [];
  const contains: KrStockEntry[] = [];

  for (const s of KR_STOCK_LIST) {
    const name = s.name.toLowerCase();
    const ticker = s.ticker.toLowerCase();
    if (name === q || ticker === q) {
      exact.push(s);
    } else if (name.startsWith(q) || ticker.startsWith(q)) {
      startsWith.push(s);
    } else if (name.includes(q) || ticker.includes(q)) {
      contains.push(s);
    }
  }

  // 중복 티커 제거 (동일 티커가 여러 이름으로 등록된 경우 첫 번째만 유지)
  const seen = new Set<string>();
  const deduped: KrStockEntry[] = [];
  for (const s of [...exact, ...startsWith, ...contains]) {
    if (!seen.has(s.ticker)) {
      seen.add(s.ticker);
      deduped.push(s);
    }
  }

  return deduped.slice(0, 8);
}
