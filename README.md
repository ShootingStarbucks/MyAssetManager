# MyAssetManager

미국 주식·한국 주식·암호화폐를 한 곳에서 관리하는 개인 포트폴리오 관리 웹 애플리케이션입니다.

## 주요 기능

- **실시간 시세 조회** — 60초 폴링, Finnhub(미국 주식) / Yahoo Finance(한국 주식) / CoinGecko(암호화폐)
- **보유 자산 CRUD** — 미국 주식·한국 주식·암호화폐 추가·수정·삭제, 최대 20종목
- **거래 기록** — 매수/매도 내역 관리, 평균단가 자동 계산
- **포트폴리오 분석** — 샤프 지수, 리스크 평가, 집중 위험 경고(단일 종목 >30% / 주식 비중 >80%)
- **리밸런싱 제안** — 목표 배분 설정 후 현재 배분과 비교
- **월간 리포트** — 자산 변화 요약, 최고/최저 성과 종목, 다음 달 액션 제안
- **AI 인사이트** — Google Generative AI 기반 포트폴리오 분석 코멘트
- **현금 관리** — 현금 잔액 및 은행 계좌 이자 수익률 관리

## 기술 스택

| 분류 | 기술 / 버전 |
|------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| Database | SQLite + Prisma v7 (libsql adapter) |
| Authentication | Auth.js v5 (Credentials) |
| Server State | TanStack Query v5 |
| UI State | Zustand v5 |
| Charts | Recharts v3 |
| Validation | Zod v3 |
| Testing | Vitest + Testing Library |
| AI | Google Generative AI |

## 시작하기

### 1. 저장소 클론 및 의존성 설치

```bash
git clone <repository-url>
cd MyAssetManager
npm install
```

### 2. 환경변수 설정

`.env.local` 파일을 생성하고 아래 값을 채웁니다.

```env
DATABASE_URL="file:./prisma/dev.db"
AUTH_SECRET="..."                        # npx auth secret 으로 생성
FINNHUB_API_KEY="..."                    # https://finnhub.io/register
GOOGLE_AI_API_KEY="..."                  # AI 인사이트 기능 (선택)
NEXT_PUBLIC_REFRESH_MS="60000"           # 시세 폴링 간격 (ms)
```

> `KRX_API_KEY` — 선택 사항. 없으면 Yahoo Finance로 자동 폴백됩니다.

### 3. 데이터베이스 초기화

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 4. 테스트 계정 생성 (선택)

샘플 데이터가 포함된 테스트 계정을 생성합니다.

```bash
npx tsx prisma/seed.ts
```

생성되는 계정:

| 항목 | 값 |
|------|---|
| 이메일 | `test@myasset.dev` |
| 비밀번호 | `Test1234!` |

보유 자산 7종 (AAPL, TSLA, NVDA, 삼성전자, SK하이닉스, BTC, ETH), 현금 계좌 3종, 포트폴리오 스냅샷 12개가 함께 생성됩니다.

### 5. 개발 서버 실행

```bash
npm run dev
# → http://localhost:3000
```

## 명령어 레퍼런스

```bash
npm run dev          # 개발 서버 실행 (localhost:3000)
npm run build        # 프로덕션 빌드 (타입 검사 포함)
npm run lint         # ESLint 실행
npm test             # 테스트 실행 (108개 케이스)
npx tsc --noEmit     # 타입 검사만 (빌드 없이)

# Prisma
npx prisma migrate dev --name <name>   # 스키마 변경 후 마이그레이션
npx prisma generate                    # 클라이언트 재생성
npx prisma studio                      # DB GUI 실행
```

## 무중단 배포 (Blue-Green)

GitHub Actions + Docker Blue-Green 방식으로 서비스 중단 없이 배포합니다.

### 배포 흐름

```
로컬 코드 수정
  → release/** 브랜치로 PR Merge
  → GitHub Actions 자동 실행
      ├─ Docker 이미지 빌드
      ├─ 이미지(tar.gz) + prisma/ + prisma.config.ts → SCP 전송
      └─ SSH로 deploy.sh 실행
           ├─ prisma migrate deploy  (DB 마이그레이션 자동 적용)
           ├─ Blue/Green 컨테이너 교체
           ├─ 헬스체크 통과 확인
           ├─ Nginx 트래픽 전환
           └─ 이전 컨테이너 종료
```

### GitHub Secrets 설정

저장소 **Settings → Secrets and variables → Actions**에서 아래 3개를 등록합니다.

| Secret | 값 |
|--------|---|
| `OCI_HOST` | OCI VM 공인 IP |
| `OCI_USER` | `ubuntu` |
| `OCI_SSH_KEY` | SSH 개인키 전체 내용 (`-----BEGIN ...` 포함) |

### 서버 구조

```
/home/ubuntu/
├── deploy.sh              # 배포 스크립트 (Blue-Green 교체 로직)
├── prisma/                # 마이그레이션 파일 (GitHub Actions가 전송)
├── prisma.config.ts       # Prisma 설정 (GitHub Actions가 전송)
├── myasset-manager.tar.gz # Docker 이미지 (GitHub Actions가 전송)
└── app/
    └── data/
        └── dev.db         # SQLite DB 파일 (볼륨 마운트로 영구 보관)

# Nginx 설정
/etc/nginx/sites-available/nextjs
```

- **Blue 컨테이너**: 포트 3000
- **Green 컨테이너**: 포트 3001
- Nginx가 현재 활성 컨테이너로 트래픽을 라우팅하며, 배포 시 포트를 교체합니다.

### 스키마 변경 시 배포 절차

DB 스키마를 변경할 때는 반드시 마이그레이션 파일을 커밋에 포함해야 합니다.

```bash
# 1. 스키마 수정 후 마이그레이션 생성
npx prisma migrate dev --name 변경내용

# 2. 마이그레이션 파일을 함께 커밋
git add prisma/migrations prisma/schema.prisma
git commit -m "feat(schema): ..."

# 3. release/** 브랜치로 PR Merge → 자동 배포
```

> 서버에서 `prisma migrate deploy`가 자동 실행되므로 별도 SSH 접속 없이 마이그레이션이 적용됩니다.

### 롤백

헬스체크 실패 시 deploy.sh가 자동으로 이전 컨테이너로 롤백합니다. 수동 롤백이 필요하면 서버에 SSH 접속 후 이전 이미지로 컨테이너를 재시작합니다.

### 주의사항

- `*.db` 파일은 `.gitignore`에 포함되어 Git에 올라가지 않습니다. DB는 서버 볼륨에서만 유지됩니다.
- 서버의 `/home/ubuntu/.env.local`에 `DATABASE_URL` 등 환경변수가 설정되어 있어야 합니다.
- 워크플로우 트리거는 `release/**` 브랜치로의 PR Merge에만 반응합니다. 직접 push는 트리거되지 않습니다.

---

## 아키텍처

### 데이터 흐름

```
Component
  └─ usePortfolioSummary()
       ├─ useHoldings()          →  GET  /api/holdings
       └─ useAssetQuotes()       →  POST /api/quotes  (60s 폴링)
              ├─ finnhub-client          (미국 주식)
              ├─ yahoo-finance-client    (한국 주식 .KS / .KQ)
              └─ coingecko-client        (암호화폐)

종목 검색    →  GET  /api/search?q=&assetType=   (5분 캐시)
거래 관리    →  GET/POST /api/transactions
현금 관리    →  GET/PUT  /api/cash
월간 리포트  →  GET  /api/report/monthly
AI 인사이트  →  GET/POST /api/insights
```

### 인증 구조

Auth.js v5의 Edge Runtime 제약으로 두 파일로 분리합니다.

| 파일 | 용도 |
|------|------|
| `src/auth.config.ts` | Prisma 없는 경량 설정 — `middleware.ts` 전용 |
| `src/auth.ts` | Credentials 프로바이더 + Prisma — API Route / Server Component 전용 |

`middleware.ts`에서 `auth.ts`를 직접 import하면 `node:path` 오류가 발생합니다.

### 화폐 처리

- 미국 주식: USD, 한국 주식·암호화폐: KRW
- `toKRW(price, currency)` — USD → KRW 변환 (`src/lib/calculate-portfolio.ts`)
- 환율은 사용자 설정값 사용 (기본 1380 KRW/USD), `GET/PUT /api/settings/exchange-rate`로 관리

## 프로젝트 구조

```
src/
├── app/
│   ├── dashboard/          # 메인 대시보드
│   ├── report/             # 월간 리포트 페이지
│   ├── (auth)/             # 로그인·회원가입
│   └── api/                # API 라우트
│       ├── holdings/       # 보유 종목 CRUD
│       ├── quotes/         # 실시간 시세 조회
│       ├── search/         # 종목 자동완성 검색
│       ├── transactions/   # 거래 기록
│       ├── cash/           # 현금·현금 계좌 관리
│       ├── rebalance/      # 리밸런싱 목표 배분
│       ├── snapshots/      # 포트폴리오 스냅샷
│       ├── insights/       # AI 인사이트
│       ├── report/         # 월간 리포트 데이터
│       └── settings/       # 환율 설정
├── components/
│   ├── dashboard/          # 대시보드 컴포넌트 (17개)
│   ├── report/             # 리포트 컴포넌트 (6개)
│   ├── ui/                 # 공통 UI (Card, Badge, Spinner 등)
│   └── providers/          # SessionProvider, QueryProvider
├── hooks/                  # TanStack Query 커스텀 훅
├── lib/
│   ├── calculate-portfolio.ts   # 포트폴리오 계산 (PnL, 리스크, 리밸런싱)
│   ├── finnhub-client.ts        # 미국 주식 API
│   ├── yahoo-finance-client.ts  # 한국 주식 API
│   ├── coingecko-client.ts      # 암호화폐 API
│   ├── exchange-rate-client.ts  # 환율 조회
│   ├── format-currency.ts       # 화폐 포맷팅
│   ├── rate-limit.ts            # 슬라이딩 윈도우 레이트 리미터
│   └── prisma.ts                # Prisma 클라이언트 싱글톤
├── auth.ts                 # Auth.js 전체 설정 (Prisma 포함)
├── auth.config.ts          # Auth.js 경량 설정 (Edge용)
└── middleware.ts            # 라우트 보호 미들웨어
prisma/
├── schema.prisma           # DB 스키마 (User, Holding, Transaction, ...)
└── dev.db                  # SQLite DB 파일 (gitignored)
```

## 외부 API 설정

| API | 용도 | 키 발급 |
|-----|------|---------|
| Finnhub | 미국 주식 실시간 시세 | https://finnhub.io/register (무료 티어: 60 req/min) |
| CoinGecko | 암호화폐 시세 | API 키 불필요 (무료) |
| Yahoo Finance | 한국 주식 시세 | API 키 불필요 (내부 클라이언트 사용) |
| Google Generative AI | AI 인사이트 생성 | https://aistudio.google.com/ |

> **Finnhub 제한**: 무료 티어는 분당 60 req/min. 이 때문에 보유 종목 최대 20개로 제한됩니다.

## 테스트

```bash
npm test             # 1회 실행
npm run test:watch   # 파일 변경 감지 모드
```

| 테스트 파일 | 대상 | 케이스 수 |
|-----------|------|---------|
| `auth-register.test.ts` | 회원가입 API | 성공·중복·비밀번호 검증 |
| `auth-login.test.ts` | 로그인 콜백 | 성공·없는 이메일·잘못된 비밀번호 |
| `auth-schemas.test.ts` | Zod 인증 스키마 | 이메일·비밀번호 형식 |
| `middleware.test.ts` | 라우트 보호 | 미인증 차단·인증 통과 |
| `rate-limit.test.ts` | 레이트 리미터 | 허용·차단·IP 파싱 |
| `holdings.test.ts` | 보유 종목 API | CRUD·유효성·중복 검증 |
| `holdings-id.test.ts` | 종목 수정·삭제 | 수량 수정·삭제 |
| `quotes.test.ts` | 시세 조회 API | 자산 유형별 분기·오류 처리 |
| `search.test.ts` | 종목 검색 API | 유형별 검색·빈 배열 반환 |
| `calculate-portfolio.test.ts` | 포트폴리오 계산 | KRW 환산·수익률·기간 |

총 **108개** 테스트 케이스

## 개발 현황

### 구현 완료

- [x] 회원가입 / 로그인 (Auth.js Credentials)
- [x] 보유 자산 CRUD (미국 주식·한국 주식·암호화폐)
- [x] 실시간 시세 조회 (3개 외부 API, 60초 폴링)
- [x] 거래 기록 (매수/매도) 및 평균단가 자동 계산
- [x] 포트폴리오 분석 (리스크 평가, 샤프 지수, 집중 위험 경고)
- [x] 리밸런싱 제안
- [x] 월간 리포트 생성
- [x] AI 인사이트 (Google Generative AI)
- [x] 종합 테스트 커버리지 (108개 케이스)

### 진행 중 / 예정

- [ ] 현금 계좌 UI 통합 (API 완료, 프론트엔드 미연결)
- [ ] 포트폴리오 스냅샷 시계열 차트 (API 완료, 차트 구현 필요)
- [ ] 환율 자동 업데이트 (현재 수동 설정)

## 주요 제약 사항

- **Zod v3 고정**: v4는 CJS 빌드가 없어 Turbopack에서 모듈 오류 발생
- **보유 종목 최대 20개**: Finnhub 무료 티어 한도(60 req/min) 기반
- **SQLite 사용**: 개발·개인 사용 목적. 팀 운영 시 PostgreSQL 전환 권장
- **Edge Runtime 제약**: `middleware.ts`는 반드시 `auth.config.ts`만 import
