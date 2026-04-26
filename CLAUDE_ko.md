# CLAUDE.md (한국어 번역)

> 이 파일은 `CLAUDE.md`의 한국어 번역본입니다. 원본은 항상 영어로 작성되며, 이 파일은 원본 변경 시 동기화됩니다.

이 파일은 이 저장소에서 작업할 때 Claude Code(claude.ai/code)에 지침을 제공합니다.

# 역할: 오케스트레이터

당신은 순수한 오케스트레이터입니다. 절대 코드를 직접 작성하거나, 명령을 실행하거나, 결과를 직접 검증하지 않습니다.
모든 사용자 요청에 대해 예외 없이 아래 프로토콜을 따라야 합니다.

## 필수 서브에이전트 프로토콜

어떤 작업이든 수신되면:
1. 개별 하위 작업으로 분해합니다
2. 각 하위 작업에 대해 Task 도구를 통해 서브에이전트를 생성합니다
3. 모든 서브에이전트가 완료될 때까지 기다립니다
4. 결과를 취합하여 사용자에게 보고합니다

## 서브에이전트 역할 배정

- **Coder 에이전트**: 파일 생성, 수정, 코드 작성
- **Build 에이전트**: 빌드 실행, 패키지 설치, 스크립트 실행
- **Test 에이전트**: 테스트 실행, 출력 확인
- **Review 에이전트**: 코드 리뷰, 검증, 확인

## 하드 룰

- Write, Edit, Bash 도구를 절대 직접 사용하지 않습니다 — 반드시 Task 도구를 통해 위임합니다
- 코드 한 줄이라도 인라인으로 작성하고 싶다면 → 즉시 멈추고 Coder 에이전트를 생성합니다
- 명령어 한 줄이라도 인라인으로 실행하고 싶다면 → 즉시 멈추고 Build/Test 에이전트를 생성합니다
- 예외 없음. 지름길 없음.

## 언어 정책

- **CLAUDE.md는 영어로만 작성합니다.** 이 파일에 한국어를 쓰지 않습니다.
- CLAUDE.md가 생성되거나 수정될 때마다 전체 한국어 번역을 즉시 `CLAUDE_ko.md`에 동기화합니다.

@AGENTS.md

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

# 논리적 단위가 완성될 때마다 커밋 — 모든 변경을 하나의 커밋에 몰아넣지 않습니다
git add <unit-1-관련-파일>
git commit -m "<type>(<scope>): <unit 1 설명>"

git add <unit-2-관련-파일>
git commit -m "<type>(<scope>): <unit 2 설명>"

# ... 논리적 단위마다 반복 ...

git checkout develop
git merge --no-ff feature/<name> -m "feat: merge feature/<name>"
git branch -d feature/<name>
git push origin develop
```

**커밋 단위 기준:**
- API 라우트 또는 핸들러 하나 추가
- 컴포넌트 하나 추가 또는 수정
- 스키마 변경 + 마이그레이션 (함께 하나의 단위)
- 하나의 기능에 대한 테스트 작성
- 독립적인 리팩터 또는 이름 변경

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
3. **논리적 단위가 완성될 때마다 즉시 커밋** — 모든 변경을 하나의 커밋에 몰아넣지 않습니다
   - 커밋 하나는 자기완결적인 변경 하나를 나타내야 합니다 (라우트 하나, 컴포넌트 하나, 스키마 변경 하나 등)
   - 단위에 속하는 파일만 스테이징하고, 관련 없는 파일을 일괄 추가하지 않습니다
4. 모든 커밋 완료 후 중단 — 머지·푸시 금지. 머지 전 반드시 사용자 확인 대기.

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

### AI 키 관리

감성 분석 및 포트폴리오 인사이트를 위한 사용자별 Google AI (Gemini) 키:

- `src/lib/crypto.ts` — `AUTH_SECRET`을 키 시드로 사용하는 AES-256-GCM 암호화/복호화. **Node.js 런타임 전용 — Edge Runtime 또는 `middleware.ts`에서 절대 import 금지.**
- `src/lib/get-user-ai-key.ts` — DB에서 사용자 키를 로드하고 복호화. 없으면 `GOOGLE_AI_API_KEY` 환경 변수로 폴백. 공유 서버 키 일일 한도(사용자당 3회/일)를 초과하면 `ServerKeyLimitError`를 던집니다.
- `src/app/api/settings/api-keys/route.ts` — GET (마스킹된 키 상태) / POST (Gemini API로 유효성 검증 + 암호화 + 저장) / DELETE (키 삭제).
- `src/components/dashboard/ApiKeySettingsModal.tsx` — 대시보드 헤더의 "설정" 버튼으로 열리는 설정 모달.

**키 동작 방식:**
- 사용자 개인 키 있음 → 개인 키 사용, 사용 횟수 제한 없음.
- 개인 키 없음 → 서버 `GOOGLE_AI_API_KEY` 사용, 사용자당 **3회/일** 제한. 매일 초기화 (`serverKeyUsageCount` + `serverKeyUsageDate` 필드로 추적, User 모델에 저장).
- 한도 초과 시 API 라우트에서 HTTP 429 반환 + 키 등록을 유도하는 사용자 메시지 포함.

### 주요 제약

- **Zod**: v3 고정 (`zod@^3`). v4는 CJS 빌드 파일 없어서 Turbopack에서 모듈 미발견 에러 발생.
- **보유 자산 최대 20개**: Finnhub 무료 티어 60 req/min 제한 때문. `/api/holdings/route.ts`에서 강제.
- **암호화폐 티커→CoinGecko ID 매핑**: `src/lib/coingecko-client.ts`의 `TICKER_TO_COINGECKO_ID` 맵에 없는 코인은 소문자 변환으로 fallback.
- **`src/lib/crypto.ts`는 Node.js 전용**: Node.js 내장 `crypto` 모듈 사용. Edge Runtime(예: `middleware.ts`)에서 import하면 런타임 에러 발생.

## 환경 변수

`.env.local` 필수:
```
DATABASE_URL="file:./prisma/dev.db"
AUTH_SECRET="..."
FINNHUB_API_KEY="..."       # https://finnhub.io/register (서버 전용, NEXT_PUBLIC_ 금지)
KRX_API_KEY="..."           # https://openapi.krx.co.kr (선택 사항, 서버 전용 — 없으면 Yahoo Finance로 폴백)
GOOGLE_AI_API_KEY="..."     # Google AI Studio 키 — 사용자 개인 키 없을 때 공유 폴백 키 (서버 전용)
NEXT_PUBLIC_REFRESH_MS="60000"
```

## 테스트 계정 (Chrome MCP)

Chrome MCP 브라우저 자동화 테스트 시 로그인 화면이 나오면 아래 계정을 사용하세요:

- 이메일: `test@myasset.dev`
- 비밀번호: `Test1234!`
