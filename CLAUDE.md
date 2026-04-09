# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

You are the orchestrator. subagents execute. never build, verify, or code inline. Your job is to plan, prioritize & coordinate.

@AGENTS.md

## Commands

```bash
npm run dev          # 개발 서버 (http://localhost:3000)
npm run build        # 프로덕션 빌드 (타입 검사 포함)
npm run lint         # ESLint 실행
npx tsc --noEmit     # 타입 검사만 (빌드 없이)

# DB
npx prisma migrate dev --name <name>   # 스키마 변경 후 마이그레이션
npx prisma generate                    # 클라이언트 재생성
npx prisma studio                      # DB GUI
```

## Architecture

**Next.js 16 App Router** + **TypeScript strict** + **Tailwind CSS v4**

### 인증 (Auth.js v5)

두 파일로 분리 — Edge Runtime 제약 때문:

- `src/auth.config.ts` — Prisma 없는 경량 설정. 미들웨어(`src/middleware.ts`)에서만 사용. Edge Runtime 호환.
- `src/auth.ts` — Credentials provider + Prisma 연동 전체 설정. API Route와 서버 컴포넌트에서 사용.

`src/middleware.ts`가 `auth.ts`를 직접 import하면 `node:path`/`node:url` 에러 발생. 반드시 `auth.config.ts`만 사용해야 함.

### 데이터베이스 (Prisma v7 + SQLite)

- `prisma/schema.prisma` — `datasource`에 `url` 프로퍼티 없음. URL은 `prisma.config.ts`에서 관리.
- `src/lib/prisma.ts` — `@prisma/adapter-libsql` 어댑터로 PrismaClient 생성. 생성된 클라이언트(`src/generated/prisma/client.ts`)는 `@ts-nocheck`이라 타입 캐스팅 필요.
- `src/generated/prisma/` — `npx prisma generate`로 자동 생성. 직접 편집 금지.
- DB 파일: `prisma/dev.db` (gitignore됨)

### 데이터 흐름

```
컴포넌트
  → usePortfolioSummary()           # 집계 훅
      → useHoldings()               # GET /api/holdings (TanStack Query)
      → useAssetQuotes(holdings)    # POST /api/quotes  (TanStack Query, 60초 폴링)
          → /api/quotes/route.ts    # API 키 보호 경계 (서버 전용)
              → finnhub-client.ts   # 미국 주식 (Finnhub API)
              → yahoo-finance-client.ts  # 한국 주식 (.KS/.KQ 심볼)
              → coingecko-client.ts # 암호화폐 (API 키 불필요)
```

모든 외부 API 호출은 `/api/quotes` Route를 통해서만. 컴포넌트가 API 클라이언트를 직접 import하지 않는다.

### 가격 통화 처리

미국 주식은 USD, 한국 주식/암호화폐는 KRW. `src/lib/calculate-portfolio.ts`의 `toKRW(price, currency)`가 USD→KRW 환산(고정 환율). 총 자산은 항상 KRW 기준.

### 상태 관리

- **서버 상태** (보유 자산 목록, 실시간 가격): TanStack Query
- **UI 상태**: Zustand (현재는 최소 사용)
- localStorage 없음 — 모든 보유 자산은 DB(SQLite)에 저장

### 주요 제약

- **Zod**: v3 고정 (`zod@^3`). v4는 CJS 빌드 파일 없어서 Turbopack에서 모듈 미발견 에러 발생.
- **보유 자산 최대 20개**: Finnhub 무료 티어 60 req/min 제한 때문. `/api/holdings/route.ts`에서 강제.
- **암호화폐 티커→CoinGecko ID 매핑**: `src/lib/coingecko-client.ts`의 `TICKER_TO_COINGECKO_ID` 맵에 없는 코인은 소문자 변환으로 fallback.

## 환경변수

`.env.local` 필수:
```
DATABASE_URL="file:./prisma/dev.db"
AUTH_SECRET="..."
FINNHUB_API_KEY="..."       # https://finnhub.io/register (서버 전용, NEXT_PUBLIC_ 금지)
NEXT_PUBLIC_REFRESH_MS="60000"
```
