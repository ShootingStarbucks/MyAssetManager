import { describe, it, expect } from 'vitest'
import {
  toKRW,
  calculateTotalValue,
  calculatePortfolioSummary,
  getBaselineDate,
  calculatePeriodReturn,
  calculatePortfolioPeriodReturn,
} from '@/lib/calculate-portfolio'
import type { HoldingWithQuote } from '@/types/portfolio.types'
import type { HistoricalPriceResult } from '@/types/asset.types'

// ─── 헬퍼 ───────────────────────────────────────────────────────────────────

function makeHolding(
  overrides: Partial<HoldingWithQuote> & { quote?: HoldingWithQuote['quote'] }
): HoldingWithQuote {
  return {
    id: 'h1',
    ticker: 'AAPL',
    assetType: 'us-stock',
    quantity: 1,
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

// ─── getBaselineDate ─────────────────────────────────────────────────────────

describe('getBaselineDate()', () => {
  it("'1M' → 오늘 기준 30일 전", () => {
    const expected = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
    expect(getBaselineDate('1M', '2024-01-15')).toBe(expected)
  })

  it("'3M' → 오늘 기준 90일 전", () => {
    const expected = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10)
    expect(getBaselineDate('3M', '2024-01-15')).toBe(expected)
  })

  it("'6M' → 오늘 기준 180일 전", () => {
    const expected = new Date(Date.now() - 180 * 86400000).toISOString().slice(0, 10)
    expect(getBaselineDate('6M', '2024-01-15')).toBe(expected)
  })

  it("'1Y' → 오늘 기준 365일 전", () => {
    const expected = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10)
    expect(getBaselineDate('1Y', '2024-01-15')).toBe(expected)
  })

  it("'전체' → createdAt의 날짜 부분 반환", () => {
    expect(getBaselineDate('전체', '2024-01-15T10:00:00.000Z')).toBe('2024-01-15')
  })
})

// ─── calculatePeriodReturn ───────────────────────────────────────────────────

describe('calculatePeriodReturn()', () => {
  it('상승 케이스: 현재가 > 기준가 → returnPercent 양수', () => {
    const holding = makeHolding({
      ticker: 'AAPL',
      assetType: 'us-stock',
      quantity: 1,
      quote: { ticker: 'AAPL', assetType: 'us-stock' as const, price: 200, change: 0, changePercent: 0, currency: 'USD' },
    })
    const historical: HistoricalPriceResult = {
      ticker: 'AAPL',
      price: 100,
      currency: 'USD',
      date: '2024-01-15',
    }
    const result = calculatePeriodReturn(holding, historical)
    expect(result.returnPercent).toBeGreaterThan(0)
    expect(result.returnKRW).toBeGreaterThan(0)
  })

  it('하락 케이스: 현재가 < 기준가 → returnPercent 음수', () => {
    const holding = makeHolding({
      ticker: 'AAPL',
      assetType: 'us-stock',
      quantity: 1,
      quote: { ticker: 'AAPL', assetType: 'us-stock' as const, price: 80, change: 0, changePercent: 0, currency: 'USD' },
    })
    const historical: HistoricalPriceResult = {
      ticker: 'AAPL',
      price: 100,
      currency: 'USD',
      date: '2024-01-15',
    }
    const result = calculatePeriodReturn(holding, historical)
    expect(result.returnPercent).toBeLessThan(0)
    expect(result.returnKRW).toBeLessThan(0)
  })

  it('historicalResult.price === null → returnPercent, returnKRW 모두 null', () => {
    const holding = makeHolding({
      ticker: 'AAPL',
      quantity: 1,
      quote: { ticker: 'AAPL', assetType: 'us-stock' as const, price: 200, change: 0, changePercent: 0, currency: 'USD' },
    })
    const historical: HistoricalPriceResult = {
      ticker: 'AAPL',
      price: null,
      currency: null,
      date: null,
      error: 'NO_DATA',
    }
    const result = calculatePeriodReturn(holding, historical)
    expect(result.returnPercent).toBeNull()
    expect(result.returnKRW).toBeNull()
  })

  it('USD 자산: toKRW 환산 적용 — currentPriceKRW = price × 1380 × quantity', () => {
    // price=100 USD, quantity=2 → 100 * 1380 * 2 = 276,000 KRW
    const holding = makeHolding({
      ticker: 'AAPL',
      assetType: 'us-stock',
      quantity: 2,
      quote: { ticker: 'AAPL', assetType: 'us-stock' as const, price: 100, change: 0, changePercent: 0, currency: 'USD' },
    })
    const historical: HistoricalPriceResult = {
      ticker: 'AAPL',
      price: 50,
      currency: 'USD',
      date: '2024-01-15',
    }
    const result = calculatePeriodReturn(holding, historical)
    expect(result.currentPriceKRW).toBe(276_000)
    // baselinePriceKRW = 50 * 1380 * 2 = 138,000
    expect(result.baselinePriceKRW).toBe(138_000)
    // returnPercent = (276000 - 138000) / 138000 * 100 = 100%
    expect(result.returnPercent).toBeCloseTo(100)
  })
})

// ─── calculatePortfolioPeriodReturn ─────────────────────────────────────────

describe('calculatePortfolioPeriodReturn()', () => {
  it('빈 holdingsWithQuotes 배열 → returnPercent null', () => {
    const result = calculatePortfolioPeriodReturn('1M', [], [])
    expect(result.returnPercent).toBeNull()
    expect(result.returnKRW).toBeNull()
  })

  it('단일 종목 정상 케이스 → 올바른 returnPercent 계산', () => {
    // KRW 자산: 현재 100,000, 기준 80,000 → +25%
    const holding = makeHolding({
      ticker: '005930',
      assetType: 'kr-stock',
      quantity: 1,
      quote: { ticker: '005930', assetType: 'kr-stock' as const, price: 100_000, change: 0, changePercent: 0, currency: 'KRW' },
    })
    const historical: HistoricalPriceResult = {
      ticker: '005930',
      price: 80_000,
      currency: 'KRW',
      date: '2024-01-15',
    }
    const result = calculatePortfolioPeriodReturn('1M', [holding], [historical])
    expect(result.returnPercent).toBeCloseTo(25)
    expect(result.returnKRW).toBe(20_000)
  })

  it('일부 historicalResult price: null → returnPercent null (hasAllBaselines = false)', () => {
    const holding1 = makeHolding({
      id: 'h1',
      ticker: 'AAPL',
      assetType: 'us-stock',
      quantity: 1,
      quote: { ticker: 'AAPL', assetType: 'us-stock' as const, price: 200, change: 0, changePercent: 0, currency: 'USD' },
    })
    const holding2 = makeHolding({
      id: 'h2',
      ticker: '005930',
      assetType: 'kr-stock',
      quantity: 1,
      quote: { ticker: '005930', assetType: 'kr-stock' as const, price: 70_000, change: 0, changePercent: 0, currency: 'KRW' },
    })
    const historicals: HistoricalPriceResult[] = [
      { ticker: 'AAPL', price: 150, currency: 'USD', date: '2024-01-15' },
      { ticker: '005930', price: null, currency: null, date: null, error: 'NO_DATA' },
    ]
    const result = calculatePortfolioPeriodReturn('1M', [holding1, holding2], historicals)
    expect(result.returnPercent).toBeNull()
    expect(result.returnKRW).toBeNull()
  })
})
