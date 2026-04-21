# SKILLS.md vs 현재 구현 갭 분석

> 분석 기준일: 2026-04-19
> 분석 대상: `SKILLS.md` (AssetLens 투자 분석 규칙 정의서) vs 현재 코드베이스
> 로드맵 기준: SKILLS.md §8
> 전체 구현률: ~75%

---

## Phase 1 — 기반 강화

### §1 자산 분류 기준

| 항목 | Spec | 현재 구현 | 상태 |
|---|---|---|---|
| 자산군 구분 | STOCK / CRYPTO / CASH | us-stock / kr-stock / crypto | 🟡 부분 (STOCK을 국내/해외로 세분화) |
| exchange 필드 | KOSPI, NASDAQ 등 | schema.prisma Line 49 | ✅ 구현됨 |
| purchaseDate 필드 | YYYY-MM-DD | schema.prisma Line 51 | ✅ 구현됨 |
| currency 필드 | KRW / USD | schema.prisma Line 50 | ✅ 구현됨 |
| memo 필드 | 선택 입력 | schema.prisma Line 52 | ✅ 구현됨 |
| CASH 상세 | institution, accountType, amount, interestRate, maturityDate, memo | schema.prisma Line 85-97 | ✅ 구현됨 |

**구현률: 100% ✅**

---

### §2 투자 지표 계산

| 항목 | 상태 |
|---|---|
| 평가금액, 평가손익, 수익률 | ✅ 구현됨 (`calculate-portfolio.ts` Line 33-54) |
| 총 자산, 총 수익률 | ✅ 구현됨 (`calculate-portfolio.ts` Line 174-257) |
| 자산군별 비중 / 종목별 비중 | ✅ 구현됨 (`calculate-portfolio.ts` Line 205-239) |
| 자산 편중도 경고 (30% / 50% / 80%) | ✅ 구현됨 (`calculate-portfolio.ts` Line 66-110) |
| 리스크 등급 (AGGRESSIVE / MODERATE / CONSERVATIVE) | ✅ 구현됨 (`calculate-portfolio.ts` Line 112-122) |
| 샤프 지수 (Sharpe Ratio) | 🟡 함수 정의됨(Line 124-135)이나 UI에서 미사용 |
| 리밸런싱 제안 계산 | ✅ 구현됨 (`calculate-portfolio.ts` Line 137-167) |

**구현률: 95% 🟡**

---

### §7 예외 처리

| 항목 | Spec | 상태 |
|---|---|---|
| 현재가 미입력 → 매수가 대체 + "현재가 미입력" 배지 | 명시됨 | ❌ 미구현 |
| 통화 혼용 → 환율 입력 모달 | 명시됨 | ✅ ExchangeRateModal.tsx (USD 홀딩 존재 시 자동 트리거) |
| 자산 0개 → AI 버튼 비활성화 | 명시됨 | ✅ insights/route.ts Line 34-37 (400 에러 반환) |
| 에러 코드 처리 (INVALID_TICKER, VALIDATION_ERROR, UNAUTHORIZED) | 일부 구현됨 | ✅ holdings/route.ts, quotes/route.ts |

**구현률: 70% 🟡**

---

## Phase 2 — 시각화

### §3 시각화

| 항목 | Spec | 현재 | 상태 |
|---|---|---|---|
| 자산 비중 차트 | 도넛 차트 (Donut) | 파이 차트 + innerRadius=45 (도넛 효과) (`AllocationChart.tsx` Line 40-48) | 🟡 유사 구현 |
| 수익률 추이 | 라인 차트 | ✅ PortfolioLineChart.tsx Line 93-125 | ✅ 구현됨 |
| 종목별 수익률 비교 | 바 차트 | ✅ HoldingReturnBarChart.tsx Line 44-66 | ✅ 구현됨 |
| 리밸런싱 비교 | 스택 바 차트 | ✅ RebalanceComparisonChart.tsx Line 42-71 | ✅ 구현됨 |
| 리스크 등급 | 게이지 차트 | ✅ RiskGaugeChart.tsx Line 15-45 | ✅ 구현됨 |
| 자산군별 색상 (파랑#3b82f6/노랑#f59e0b/민트#10b981) | Spec 정의 있음 | ✅ calculate-portfolio.ts Line 56-61 | ✅ 구현됨 |

**구현률: 95% 🟡**

---

## Phase 3 — AI 인사이트

### §4 AI 인사이트

| 항목 | 상태 |
|---|---|
| AI SDK 패키지 | ✅ `@google/generative-ai` (Google Gemini, gemini-2.5-flash) 사용 |
| "인사이트 생성" 버튼 UI | ✅ InsightCard.tsx Line 144-158 |
| 포트폴리오 요약 인사이트 | ✅ insights/route.ts + InsightCard.tsx |
| 리스크 경고 인사이트 | ✅ insights/route.ts + InsightCard.tsx |
| 리밸런싱 제안 인사이트 | ✅ insights/route.ts + InsightCard.tsx |
| 시장 조언 인사이트 | ✅ insights/route.ts + InsightCard.tsx (4개 항목 모두 구현) |
| 웹서치 기반 시장 조언 | ➖ 해당 없음 (Gemini 학습 데이터 기반 조언으로 대체, Spec 변경됨) |
| 인사이트 펼치기/접기 UI | ✅ InsightCard.tsx Line 106-121 |
| 면책 문구 | ✅ InsightCard.tsx Line 136-138 |
| 자산 0개 버튼 방지 | ✅ insights/route.ts Line 34-37 (400 에러 반환) |

**구현률: 90% 🟡**

---

## Phase 4 — 리포트 & 확장성

### §5 리포트

| 항목 | 상태 |
|---|---|
| 월간 자산 변동 집계 | ❌ 미구현 |
| 자산군별 성과 집계 | ❌ 미구현 |
| 베스트/워스트 종목 | ❌ 미구현 |
| 리스크 변화 추이 | ❌ 미구현 |
| 만기 도래 예금 안내 | ❌ 미구현 |

**구현률: 0% 🔴**

### §6 데이터 확장성

| 항목 | Spec | 현재 | 상태 |
|---|---|---|---|
| PriceProvider 추상 인터페이스 | `interface PriceProvider` | price-provider.ts Line 1-5 에 인터페이스 정의만 있음 | 🟡 인터페이스만, 구현체 없음 |
| ManualPriceProvider (수동 입력) | 1차 구현 | 없음 (항상 API) | ❌ 미구현 |
| 환율 | 동적 API 또는 사용자 입력 | 고정값 1 USD = 1,380 KRW + ExchangeRateModal.tsx 사용자 입력 구현, 동적 API 미연동 | 🟡 부분 구현 |

**구현률: 55% 🟡**

---

## 전체 요약

| 섹션 | 구현률 | Phase |
|---|---|---|
| §1 자산 분류 | 100% ✅ | Phase 1 |
| §2 투자 지표 계산 | 95% 🟡 | Phase 1 |
| §7 예외 처리 | 70% 🟡 | Phase 1 |
| §3 시각화 | 95% 🟡 | Phase 2 |
| §4 AI 인사이트 | 90% 🟡 | Phase 3 |
| §5 리포트 | 0% 🔴 | Phase 4 |
| §6 데이터 확장성 | 55% 🟡 | Phase 4 |
| **전체 추정** | **~78%** | |

현재 구현은 **"핵심 기능 완성 포트폴리오 트래커"** 수준입니다.
Phase 1~3의 대부분이 구현되었으며, Phase 4(리포트 & 확장성)가 주요 미완성 과제입니다.

---

## SKILLS.md §0 업데이트 필요 항목

아래 항목은 SKILLS.md §0 구현 현황 표에 반영이 필요합니다 (2026-04-19 기준):

| 섹션 | 이전 구현률 | 갱신 구현률 | 변동 |
|---|---|---|---|
| §1 자산 분류 기준 | 40% | 100% | +60% ✅ |
| §2 투자 지표 계산 | 60% | 95% | +35% 🟡 |
| §3 시각화 | 20% | 95% | +75% 🟡 |
| §4 AI 인사이트 | 0% | 75% | +75% 🟡 |
| §5 리포트 | 0% | 0% | 변동 없음 🔴 |
| §6 데이터 확장성 | 20% | 55% | +35% 🟡 |
| §7 예외 처리 | 30% | 70% | +40% 🟡 |
| **전체** | **~25%** | **~75%** | **+50%** |
