import { describe, it, expect } from 'vitest'
import {
  toKRW,
  calculateTotalValue,
  calculatePortfolioSummary,
  calculateUnrealizedPnL,
} from '@/lib/calculate-portfolio'
import type { HoldingWithQuote } from '@/types/portfolio.types'

// ─── 헬퍼 ───────────────────────────────────────────────────────────────────

function makeHolding(
  overrides: Partial<HoldingWithQuote> & { quote?: HoldingWithQuote['quote'] }
): HoldingWithQuote {
  return {
    id: 'h1',
    ticker: 'AAPL',
    assetType: 'us-stock',
    quantity: 1,
    currency: 'USD' as const,
    createdAt: new Date().toISOString(),
    totalValue: 0,
    quote: {
      ticker: 'AAPL',
      assetType: 'us-stock',
      price: 100,
      change: 0,
      changePercent: 0,
      currency: 'USD',
    },
    ...overrides,
  }
}

// ─── toKRW ──────────────────────────────────────────────────────────────────

describe('toKRW()', () => {
  it('USD 가격을 1380 환율로 환산한다', () => {
    expect(toKRW(100, 'USD')).toBe(138_000)
  })

  it('KRW 가격은 그대로 반환한다', () => {
    expect(toKRW(50_000, 'KRW')).toBe(50_000)
  })

  it('0 USD → 0 KRW', () => {
    expect(toKRW(0, 'USD')).toBe(0)
  })

  it('소수 USD도 정확히 환산한다', () => {
    expect(toKRW(1.5, 'USD')).toBe(2070)
  })
})

// ─── calculateTotalValue ─────────────────────────────────────────────────────

describe('calculateTotalValue()', () => {
  it('빈 배열 → 0', () => {
    expect(calculateTotalValue([])).toBe(0)
  })

  it('quote 없는 보유 자산은 합산에서 제외한다', () => {
    const holdings = [makeHolding({ quote: null })]
    expect(calculateTotalValue(holdings)).toBe(0)
  })

  it('USD 자산 단일 종목 — 가격 × 수량 × 환율', () => {
    // price=100 USD, quantity=2 → 100 * 2 * 1380 = 276,000
    const holdings = [makeHolding({ quantity: 2 })]
    expect(calculateTotalValue(holdings)).toBe(276_000)
  })

  it('KRW 자산 단일 종목 — 가격 × 수량 (환율 미적용)', () => {
    const holdings = [
      makeHolding({
        ticker: '005930',
        assetType: 'kr-stock',
        quantity: 10,
        quote: { ticker: '005930', assetType: 'kr-stock' as const, price: 70_000, change: 0, changePercent: 0, currency: 'KRW' },
      }),
    ]
    expect(calculateTotalValue(holdings)).toBe(700_000)
  })

  it('USD + KRW 혼합 종목의 총합', () => {
    // AAPL: 100 USD × 1 × 1380 = 138,000
    // 005930: 70,000 KRW × 2 = 140,000
    // total = 278,000
    const holdings = [
      makeHolding({ quantity: 1 }),
      makeHolding({
        id: 'h2',
        ticker: '005930',
        assetType: 'kr-stock',
        quantity: 2,
        quote: { ticker: '005930', assetType: 'kr-stock' as const, price: 70_000, change: 0, changePercent: 0, currency: 'KRW' },
      }),
    ]
    expect(calculateTotalValue(holdings)).toBe(278_000)
  })
})

// ─── calculateUnrealizedPnL ──────────────────────────────────────────────────

describe('calculateUnrealizedPnL()', () => {
  it('avgCost 없으면 모두 null 반환', () => {
    const holding = makeHolding({ avgCost: null })
    const result = calculateUnrealizedPnL(holding)
    expect(result.unrealizedPnL).toBeNull()
    expect(result.unrealizedPnLPercent).toBeNull()
    expect(result.avgCostKRW).toBeNull()
  })

  it('quote 없으면 모두 null 반환', () => {
    const holding = makeHolding({ avgCost: 80, quote: null })
    const result = calculateUnrealizedPnL(holding)
    expect(result.unrealizedPnL).toBeNull()
  })

  it('KRW 자산 — 현재가 > 평단가 → 양수 수익', () => {
    // avgCost=80,000, price=100,000, qty=1 → PnL = 20,000, percent = 25%
    const holding = makeHolding({
      assetType: 'kr-stock',
      quantity: 1,
      avgCost: 80_000,
      quote: { ticker: '005930', assetType: 'kr-stock' as const, price: 100_000, change: 0, changePercent: 0, currency: 'KRW' },
    })
    const result = calculateUnrealizedPnL(holding)
    expect(result.unrealizedPnL).toBe(20_000)
    expect(result.unrealizedPnLPercent).toBeCloseTo(25)
    expect(result.avgCostKRW).toBe(80_000)
  })

  it('KRW 자산 — 현재가 < 평단가 → 음수 손실', () => {
    const holding = makeHolding({
      assetType: 'kr-stock',
      quantity: 2,
      avgCost: 100_000,
      quote: { ticker: '005930', assetType: 'kr-stock' as const, price: 80_000, change: 0, changePercent: 0, currency: 'KRW' },
    })
    const result = calculateUnrealizedPnL(holding)
    expect(result.unrealizedPnL).toBe(-40_000)
    expect(result.unrealizedPnLPercent).toBeCloseTo(-20)
  })

  it('USD 자산 — avgCost와 price 모두 KRW 환산 후 계산', () => {
    // avgCost=80 USD → 110,400 KRW, price=100 USD → 138,000 KRW, qty=1
    // PnL = (138,000 - 110,400) * 1 = 27,600
    // percent = 27,600 / 110,400 * 100 = 25%
    const holding = makeHolding({
      assetType: 'us-stock',
      quantity: 1,
      avgCost: 80,
      quote: { ticker: 'AAPL', assetType: 'us-stock' as const, price: 100, change: 0, changePercent: 0, currency: 'USD' },
    })
    const result = calculateUnrealizedPnL(holding)
    expect(result.unrealizedPnL).toBeCloseTo(27_600)
    expect(result.unrealizedPnLPercent).toBeCloseTo(25)
    expect(result.avgCostKRW).toBe(110_400)
  })
})

// ─── calculatePortfolioSummary ───────────────────────────────────────────────

describe('calculatePortfolioSummary()', () => {
  it('빈 배열 → 모든 값 0, allocations 빈 배열', () => {
    const result = calculatePortfolioSummary([])
    expect(result.totalValue).toBe(0)
    expect(result.totalChange).toBe(0)
    expect(result.totalChangePercent).toBe(0)
    expect(result.holdingsCount).toBe(0)
    expect(result.allocations).toEqual([])
    expect(result.currency).toBe('KRW')
    expect(result.totalUnrealizedPnL).toBeNull()
    expect(result.totalReturnPercent).toBeNull()
  })

  it('quote 없는 보유 자산만 있을 때 totalValue = 0, holdingsCount = 1', () => {
    const result = calculatePortfolioSummary([makeHolding({ quote: null })])
    expect(result.totalValue).toBe(0)
    expect(result.holdingsCount).toBe(1)
  })

  it('전날 대비 상승: totalChange > 0, totalChangePercent > 0', () => {
    // price=110, change=10 → prevPrice=100, prevValue=138,000, curValue=151,800
    const holdings = [
      makeHolding({
        quantity: 1,
        quote: { ticker: 'AAPL', assetType: 'us-stock' as const, price: 110, change: 10, changePercent: 10, currency: 'USD' },
      }),
    ]
    const result = calculatePortfolioSummary(holdings)
    expect(result.totalChange).toBeCloseTo(13_800)      // 10 USD * 1380
    expect(result.totalChangePercent).toBeCloseTo(10)
  })

  it('전날 대비 하락: totalChange < 0', () => {
    const holdings = [
      makeHolding({
        quantity: 1,
        quote: { ticker: 'AAPL', assetType: 'us-stock' as const, price: 90, change: -10, changePercent: -10, currency: 'USD' },
      }),
    ]
    const result = calculatePortfolioSummary(holdings)
    expect(result.totalChange).toBeCloseTo(-13_800)
  })

  it('변동 없을 때: totalChange = 0, totalChangePercent = 0', () => {
    const holdings = [makeHolding({ quantity: 1 })] // change=0
    const result = calculatePortfolioSummary(holdings)
    expect(result.totalChange).toBe(0)
    expect(result.totalChangePercent).toBe(0)
  })

  it('avgCost 있는 종목 → totalUnrealizedPnL, totalReturnPercent 계산됨', () => {
    // avgCost=80,000 KRW, price=100,000 KRW, qty=1 → PnL=20,000, return=25%
    const holdings = [
      makeHolding({
        assetType: 'kr-stock',
        quantity: 1,
        avgCost: 80_000,
        quote: { ticker: '005930', assetType: 'kr-stock' as const, price: 100_000, change: 0, changePercent: 0, currency: 'KRW' },
      }),
    ]
    const result = calculatePortfolioSummary(holdings)
    expect(result.totalUnrealizedPnL).toBe(20_000)
    expect(result.totalReturnPercent).toBeCloseTo(25)
  })

  it('avgCost 없는 종목만 있을 때 totalUnrealizedPnL, totalReturnPercent = null', () => {
    const holdings = [makeHolding({ avgCost: null })]
    const result = calculatePortfolioSummary(holdings)
    expect(result.totalUnrealizedPnL).toBeNull()
    expect(result.totalReturnPercent).toBeNull()
  })

  it('allocations — 단일 종목 비율은 100%', () => {
    const holdings = [makeHolding({ quantity: 1 })]
    const result = calculatePortfolioSummary(holdings)
    expect(result.allocations).toHaveLength(1)
    expect(result.allocations[0].ticker).toBe('AAPL')
    expect(result.allocations[0].percentage).toBeCloseTo(100)
  })

  it('allocations — 동일 가치 두 종목은 각 50%', () => {
    // 두 종목 모두 KRW 100,000 × 1 = 각 100,000
    const holdings = [
      makeHolding({
        ticker: 'A',
        assetType: 'kr-stock',
        quantity: 1,
        quote: { ticker: 'A', assetType: 'kr-stock' as const, price: 100_000, change: 0, changePercent: 0, currency: 'KRW' },
      }),
      makeHolding({
        id: 'h2',
        ticker: 'B',
        assetType: 'kr-stock',
        quantity: 1,
        quote: { ticker: 'B', assetType: 'kr-stock' as const, price: 100_000, change: 0, changePercent: 0, currency: 'KRW' },
      }),
    ]
    const result = calculatePortfolioSummary(holdings)
    expect(result.allocations[0].percentage).toBeCloseTo(50)
    expect(result.allocations[1].percentage).toBeCloseTo(50)
  })

  it('allocations — 색상은 CHART_COLORS 순환 인덱스로 할당된다', () => {
    const holdings = Array.from({ length: 11 }, (_, i) =>
      makeHolding({
        id: `h${i}`,
        ticker: `T${i}`,
        quantity: 1,
        quote: { ticker: `T${i}`, assetType: 'kr-stock' as const, price: 100, change: 0, changePercent: 0, currency: 'KRW' },
      })
    )
    const result = calculatePortfolioSummary(holdings)
    // 10번 인덱스는 0번 인덱스와 색상이 같아야 함 (10 % 10 === 0)
    expect(result.allocations[10].color).toBe(result.allocations[0].color)
    // 인접한 두 슬라이스는 다른 색상
    expect(result.allocations[0].color).not.toBe(result.allocations[1].color)
  })
})
