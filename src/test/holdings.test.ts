import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/prisma', () => {
  const holdingCreate = vi.fn()
  const transactionCreate = vi.fn()
  return {
    prisma: {
      holding: {
        findMany: vi.fn(),
        count: vi.fn(),
        create: holdingCreate,
      },
      $transaction: vi.fn(async (cb: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          holding: { create: holdingCreate },
          transaction: { create: transactionCreate },
        }
        return cb(tx)
      }),
    },
  }
})

vi.mock('@/lib/finnhub-client', () => ({
  fetchUsStockQuote: vi.fn(),
}))

vi.mock('@/lib/yahoo-finance-client', () => ({
  fetchKrStockQuote: vi.fn(),
}))

vi.mock('@/lib/coingecko-client', () => ({
  fetchCryptoQuotes: vi.fn(),
}))

import { GET, POST } from '@/app/api/holdings/route'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { fetchUsStockQuote } from '@/lib/finnhub-client'
import { fetchKrStockQuote } from '@/lib/yahoo-finance-client'
import { fetchCryptoQuotes } from '@/lib/coingecko-client'

const mockAuth = auth as ReturnType<typeof vi.fn>
const mockHolding = prisma.holding as {
  findMany: ReturnType<typeof vi.fn>
  count: ReturnType<typeof vi.fn>
  create: ReturnType<typeof vi.fn>
}
const mockFetchUsStock = fetchUsStockQuote as ReturnType<typeof vi.fn>
const mockFetchKrStock = fetchKrStockQuote as ReturnType<typeof vi.fn>
const mockFetchCrypto = fetchCryptoQuotes as ReturnType<typeof vi.fn>

const AUTHED_SESSION = { user: { id: 'user-1', email: 'test@example.com' } }

function makePostRequest(body: unknown) {
  return new NextRequest('http://localhost/api/holdings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('GET /api/holdings', () => {
  beforeEach(() => vi.clearAllMocks())

  it('1. 비인증 요청 → 401', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error.code).toBe('UNAUTHORIZED')
  })

  it('2. 인증된 사용자 → 200, 보유 자산 목록 반환', async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION)
    const holdings = [
      { id: 'h1', userId: 'user-1', ticker: 'AAPL', assetType: 'us-stock', quantity: 5 },
    ]
    mockHolding.findMany.mockResolvedValue(holdings)

    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.holdings).toEqual(holdings)
  })

  it('3. 자신의 userId로만 조회한다 (findMany 호출 인자 검증)', async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION)
    mockHolding.findMany.mockResolvedValue([])

    await GET()

    expect(mockHolding.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1' } })
    )
  })
})

describe('POST /api/holdings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 기본: 유효성 검증 통과 (유효한 티커)
    mockFetchUsStock.mockResolvedValue({ ticker: 'AAPL', price: 150, change: 0, changePercent: 0, currency: 'USD', assetType: 'us-stock' })
    mockFetchKrStock.mockResolvedValue({ ticker: '005930', price: 70000, change: 0, changePercent: 0, currency: 'KRW', assetType: 'kr-stock' })
    mockFetchCrypto.mockResolvedValue([{ ticker: 'BTC', price: 50000, change: 0, changePercent: 0, currency: 'KRW', assetType: 'crypto' }])
  })

  it('1. 비인증 요청 → 401', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await POST(makePostRequest({ ticker: 'AAPL', assetType: 'us-stock', quantity: 1 }))
    expect(res.status).toBe(401)
  })

  it('2. 성공 — 유효한 데이터 → 201, holding 반환', async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION)
    mockHolding.count.mockResolvedValue(0)
    const created = { id: 'h1', userId: 'user-1', ticker: 'AAPL', assetType: 'us-stock', quantity: 2 }
    mockHolding.create.mockResolvedValue(created)

    const res = await POST(makePostRequest({ ticker: 'AAPL', assetType: 'us-stock', quantity: 2 }))
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.holding).toEqual(created)
  })

  it('3. ticker는 대문자로 정규화된다', async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION)
    mockHolding.count.mockResolvedValue(0)
    mockHolding.create.mockResolvedValue({ id: 'h1', ticker: 'AAPL' })

    await POST(makePostRequest({ ticker: 'aapl', assetType: 'us-stock', quantity: 1 }))

    expect(mockHolding.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ ticker: 'AAPL' }) })
    )
  })

  it('4. 수량 0 → 400 VALIDATION_ERROR', async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION)
    const res = await POST(makePostRequest({ ticker: 'AAPL', assetType: 'us-stock', quantity: 0 }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error.code).toBe('VALIDATION_ERROR')
  })

  it('5. 음수 수량 → 400', async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION)
    const res = await POST(makePostRequest({ ticker: 'AAPL', assetType: 'us-stock', quantity: -1 }))
    expect(res.status).toBe(400)
  })

  it('6. 잘못된 assetType → 400', async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION)
    const res = await POST(makePostRequest({ ticker: 'AAPL', assetType: 'etf', quantity: 1 }))
    expect(res.status).toBe(400)
  })

  it('7. 20개 초과 → 422', async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION)
    mockHolding.count.mockResolvedValue(20)

    const res = await POST(makePostRequest({ ticker: 'AAPL', assetType: 'us-stock', quantity: 1 }))
    expect(res.status).toBe(422)
  })

  it('8. 중복 ticker (DB unique 제약) → 409', async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION)
    mockHolding.count.mockResolvedValue(0)
    mockHolding.create.mockRejectedValue(Object.assign(new Error('Unique constraint'), { code: 'P2002' }))

    const res = await POST(makePostRequest({ ticker: 'AAPL', assetType: 'us-stock', quantity: 1 }))
    expect(res.status).toBe(409)
  })

  it('9. ticker 길이 21자 → 400', async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION)
    const res = await POST(
      makePostRequest({ ticker: 'A'.repeat(21), assetType: 'us-stock', quantity: 1 })
    )
    expect(res.status).toBe(400)
  })

  it('10. us-stock INVALID_TICKER → 422', async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION)
    mockHolding.count.mockResolvedValue(0)
    mockFetchUsStock.mockRejectedValue(Object.assign(new Error('Invalid'), { code: 'INVALID_TICKER' }))

    const res = await POST(makePostRequest({ ticker: 'XXXXXX', assetType: 'us-stock', quantity: 1 }))
    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.error.code).toBe('INVALID_TICKER')
  })

  it('11. kr-stock INVALID_TICKER → 422', async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION)
    mockHolding.count.mockResolvedValue(0)
    mockFetchKrStock.mockRejectedValue(Object.assign(new Error('Invalid'), { code: 'INVALID_TICKER' }))

    const res = await POST(makePostRequest({ ticker: '999999', assetType: 'kr-stock', quantity: 1 }))
    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.error.code).toBe('INVALID_TICKER')
  })

  it('12. crypto INVALID_TICKER → 422', async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION)
    mockHolding.count.mockResolvedValue(0)
    mockFetchCrypto.mockRejectedValue(Object.assign(new Error('Invalid'), { code: 'INVALID_TICKER' }))

    const res = await POST(makePostRequest({ ticker: 'FAKECOIN', assetType: 'crypto', quantity: 1 }))
    expect(res.status).toBe(422)
  })

  it('13. NETWORK_ERROR 시 저장 허용 (graceful bypass)', async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION)
    mockHolding.count.mockResolvedValue(0)
    mockFetchUsStock.mockRejectedValue(Object.assign(new Error('Network'), { code: 'NETWORK_ERROR' }))
    const created = { id: 'h1', userId: 'user-1', ticker: 'AAPL', assetType: 'us-stock', quantity: 1 }
    mockHolding.create.mockResolvedValue(created)

    const res = await POST(makePostRequest({ ticker: 'AAPL', assetType: 'us-stock', quantity: 1 }))
    expect(res.status).toBe(201)
  })
})
