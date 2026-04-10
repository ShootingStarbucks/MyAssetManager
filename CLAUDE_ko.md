# CLAUDE.md (한국어 번역)

> 이 파일은 `CLAUDE.md`의 한국어 번역본입니다. 원본은 항상 영어로 작성되며, 이 파일은 원본 변경 시 동기화됩니다.

이 파일은 이 저장소에서 작업할 때 Claude Code(claude.ai/code)에 지침을 제공합니다.

당신은 오케스트레이터입니다. 서브에이전트가 실행합니다. 절대 인라인으로 빌드·검증·코딩하지 마세요. 당신의 역할은 계획·우선순위 결정·조율입니다.

## 언어 정책

- **CLAUDE.md는 영어로만 작성합니다.** 이 파일에 한국어를 쓰지 않습니다.
- CLAUDE.md가 생성되거나 수정될 때마다 전체 한국어 번역을 즉시 `CLAUDE_ko.md`에 동기화합니다.

## Git Flow

**브랜치 전략** — 모든 작업은 아래 규칙을 따릅니다.

| 브랜치 | 용도 | 분기 출처 | 병합 대상 |
|--------|------|-----------|-----------|
| `main` | 프로덕션 배포 | — | — |
| `develop` | 통합 브랜치 | `main` | `main` (릴리즈 시) |
| `feature/<name>` | 신규 기능 | `develop` | `develop` |
| `fix/<name>` | 버그 수정 | `develop` | `develop` |
| `hotfix/<name>` | 긴급 패치 | `main` | `main` + `develop` |
| `release/<version>` | 릴리즈 준비 | `develop` | `main` + `develop` |

**필수 규칙:**
- `main`, `develop`에 직접 커밋 금지. 반드시 브랜치 생성 후 PR로 병합합니다.
- 브랜치명: `feature/add-login`, `fix/quote-cache`, `hotfix/auth-crash` 형식
- 새 작업 시작 전 항상 `develop`을 최신 상태로 pull합니다.

**기능 개발 절차 (가장 일반적인 케이스):**
```bash
git checkout develop && git pull origin develop
git checkout -b feature/<name>
# 작업 수행
git add <files>
git commit -m "<type>(<scope>): <설명>"
git checkout develop
git merge --no-ff feature/<name> -m "feat: merge feature/<name>"
git branch -d feature/<name>
git push origin develop
```

**커밋 메시지 형식** — Conventional Commits:
```
<type>(<scope>): <제목>

feat(auth): 소셜 로그인 추가
fix(holdings): 중복 ticker 검증 오류 수정
test(quotes): quotes API 테스트 추가
chore(deps): zod 버전 업데이트
refactor(portfolio): 수익률 계산 로직 분리
```
타입: `feat` | `fix` | `test` | `chore` | `refactor` | `docs` | `style`

**Claude 자동 수행 규칙 (모든 개발 요청 시):**
1. `git status`로 현재 브랜치 확인
2. `develop`에서 `feature/<작업명>` 브랜치 생성
3. 작업 완료 후 논리적 단위로 커밋
4. `develop`으로 `--no-ff` 머지 후 feature 브랜치 삭제
5. `git push origin develop`으로 원격 동기화

## 명령어

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

## 아키텍처

**Next.js 16 App Router** + **TypeScript strict** + **Tailwind CSS v4**

### 인증 (Auth.js v5)

Edge Runtime 제약으로 두 파일로 분리:

- `src/auth.config.ts` — Prisma 없는 경량 설정. 미들웨어(`src/middleware.ts`)에서만 사용. Edge Runtime 호환.
- `src/auth.ts` — Credentials provider + Prisma 연동 전체 설정. API Route와 서버 컴포넌트에서 사용.

`src/middleware.ts`가 `auth.ts`를 직접 import하면 `node:path`/`node:url` 에러 발생. 반드시 `auth.config.ts`만 사용해야 합니다.

### 데이터베이스 (Prisma v7 + SQLite)

- `prisma/schema.prisma` — `datasource`에 `url` 프로퍼티 없음. URL은 `prisma.config.ts`에서 관리.
- `src/lib/prisma.ts` — `@prisma/adapter-libsql` 어댑터로 PrismaClient 생성. 생성된 클라이언트(`src/generated/prisma/client.ts`)는 `@ts-nocheck`이라 타입 캐스팅 필요.
- `src/generated/prisma/` — `npx prisma generate`로 자동 생성. 직접 편집 금지.
- DB 파일: `prisma/dev.db` (gitignore됨)

### 데이터 흐름

```
컴포넌트
  -> usePortfolioSummary()           # 집계 훅
      -> useHoldings()               # GET /api/holdings (TanStack Query)
      -> useAssetQuotes(holdings)    # POST /api/quotes  (TanStack Query, 60초 폴링)
          -> /api/quotes/route.ts    # API 키 보호 경계 (서버 전용)
              -> finnhub-client.ts       # 미국 주식 (Finnhub API)
              -> yahoo-finance-client.ts # 한국 주식 (.KS/.KQ 심볼)
              -> coingecko-client.ts     # 암호화폐 (API 키 불필요)
```

모든 외부 API 호출은 `/api/quotes` Route를 통해서만. 컴포넌트가 API 클라이언트를 직접 import하지 않습니다.

### 가격·통화 처리

미국 주식은 USD, 한국 주식/암호화폐는 KRW. `src/lib/calculate-portfolio.ts`의 `toKRW(price, currency)`가 USD→KRW 환산(고정 환율). 총 자산은 항상 KRW 기준.

### 상태 관리

- **서버 상태** (보유 자산 목록, 실시간 가격): TanStack Query
- **UI 상태**: Zustand (현재는 최소 사용)
- localStorage 없음 — 모든 보유 자산은 DB(SQLite)에 저장

### 주요 제약

- **Zod**: v3 고정 (`zod@^3`). v4는 CJS 빌드 파일 없어서 Turbopack에서 모듈 미발견 에러 발생.
- **보유 자산 최대 20개**: Finnhub 무료 티어 60 req/min 제한 때문. `/api/holdings/route.ts`에서 강제.
- **암호화폐 티커→CoinGecko ID 매핑**: `src/lib/coingecko-client.ts`의 `TICKER_TO_COINGECKO_ID` 맵에 없는 코인은 소문자 변환으로 fallback.

## 환경 변수

`.env.local` 필수:
```
DATABASE_URL="file:./prisma/dev.db"
AUTH_SECRET="..."
FINNHUB_API_KEY="..."       # https://finnhub.io/register (서버 전용, NEXT_PUBLIC_ 금지)
NEXT_PUBLIC_REFRESH_MS="60000"
```
