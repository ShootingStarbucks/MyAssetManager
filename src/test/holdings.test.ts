import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    holding: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
  },
}))

import { GET, POST } from '@/app/api/holdings/route'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

const mockAuth = auth as ReturnType<typeof vi.fn>
const mockHolding = prisma.holding as {
  findMany: ReturnType<typeof vi.fn>
  count: ReturnType<typeof vi.fn>
  create: ReturnType<typeof vi.fn>
}

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
  beforeEach(() => vi.clearAllMocks())

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
    mockHolding.create.mockRejectedValue(new Error('Unique constraint'))

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
})
