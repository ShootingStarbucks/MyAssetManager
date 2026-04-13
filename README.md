# MyAssetManager

미국 주식·한국 주식·암호화폐 포트폴리오를 한 곳에서 관리하는 웹 애플리케이션.

- 실시간 현재가 조회 (60초 폴링)
- 자산 추가 시 종목 검색 자동완성 + 유효하지 않은 종목 차단
- 자산 배분 차트
- 매수/매도 거래 내역 기록 및 수량·평균단가 자동 재계산
- 현금 잔액 관리

---

## 요구사항

- Node.js 20+
- Finnhub API 키 ([무료 발급](https://finnhub.io/register))

---

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경변수 설정

```bash
# Linux / macOS
cp .env.example .env.local

# Windows CMD
copy .env.example .env.local

# Windows PowerShell
Copy-Item .env.example .env.local
```

`.env.local`을 열고 아래 값을 채운다:

```env
DATABASE_URL="file:./prisma/dev.db"
AUTH_SECRET=""                  # npx auth secret 으로 생성
FINNHUB_API_KEY="your_key_here" # https://finnhub.io/register
NEXT_PUBLIC_REFRESH_MS="60000"
```

`AUTH_SECRET` 생성:

```bash
npx auth secret
```

### 3. DB 초기화

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://localhost:3000 접속.

---

## 주요 명령어

| 명령어 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | 프로덕션 빌드 (타입 검사 포함) |
| `npm run lint` | ESLint 실행 |
| `npm test` | 테스트 전체 1회 실행 |
| `npm run test:watch` | 파일 변경 감지 모드 |
| `npx tsc --noEmit` | 타입 검사만 (빌드 없이) |
| `npx prisma migrate dev --name <name>` | 스키마 변경 후 마이그레이션 |
| `npx prisma generate` | Prisma 클라이언트 재생성 |
| `npx prisma studio` | DB GUI 실행 |

---

## 테스트

```bash
npm test
```

총 10개 파일, 108개 케이스.

| 파일 | 대상 |
|---|---|
| `auth-register.test.ts` | `POST /api/auth/register` — 성공, 이메일 중복, 비밀번호 검증 |
| `auth-login.test.ts` | `authorize()` 콜백 — 성공, 없는 이메일, 잘못된 비밀번호 |
| `auth-schemas.test.ts` | 이메일·비밀번호 Zod 스키마 — 형식 검증, 정책 규칙 |
| `middleware.test.ts` | 미들웨어 경로 보호 — 미인증 차단, 인증 통과 |
| `rate-limit.test.ts` | 슬라이딩 윈도우 레이트리밋 — 허용/차단, IP 파싱 |
| `holdings.test.ts` | `GET/POST /api/holdings` — CRUD, 유효성, 중복, 티커 검증 |
| `holdings-id.test.ts` | `PATCH/DELETE /api/holdings/[id]` — 수량 수정, 삭제 |
| `quotes.test.ts` | `POST /api/quotes` — 자산 유형별 분기, 오류 처리 |
| `search.test.ts` | `GET /api/search` — 유형별 검색, 오류 시 빈 배열 반환 |
| `calculate-portfolio.test.ts` | 포트폴리오 계산 유틸 — KRW 환산, 수익률, 기간 계산 |

---

## 기술 스택

| 분류 | 기술 |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| Database | SQLite (Prisma v7 + libsql) |
| Auth | Auth.js v5 (Credentials) |
| Server State | TanStack Query v5 |
| UI State | Zustand v5 |
| Charts | Recharts v3 |
| Test | Vitest + Testing Library |

### 외부 API

| 자산 유형 | 시세 | 검색 |
|---|---|---|
| 미국 주식 | Finnhub (API 키 필요) | Finnhub symbol search |
| 한국 주식 | Yahoo Finance (.KS/.KQ) | Yahoo Finance search |
| 암호화폐 | CoinGecko (무료) | CoinGecko `/api/v3/search` |

---

## 아키텍처

```
Component
  └─ usePortfolioSummary()
       ├─ useHoldings()          GET /api/holdings
       └─ useAssetQuotes()       POST /api/quotes  (60s 폴링)
            └─ /api/quotes/route.ts
                 ├─ finnhub-client.ts       (미국 주식)
                 ├─ yahoo-finance-client.ts  (한국 주식)
                 └─ coingecko-client.ts     (암호화폐)

검색 자동완성
  └─ useTickerSearch()           GET /api/search?q=&assetType=  (5분 캐시)

거래 내역
  └─ GET/POST /api/transactions  매수·매도 기록, 수량·평균단가 재계산

현금 잔액
  └─ GET/PUT  /api/cash          현금 잔액 조회·수정
```

모든 외부 API 호출은 서버 라우트(`/api/*`)를 통해서만 이루어진다. 컴포넌트에서 API 클라이언트를 직접 임포트하지 않는다.
