import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/finnhub-client', () => ({
  searchUsStocks: vi.fn(),
}))

vi.mock('@/lib/yahoo-finance-client', () => ({
  searchKrStocks: vi.fn(),
}))

vi.mock('@/lib/coingecko-client', () => ({
  searchCrypto: vi.fn(),
}))

import { GET } from '@/app/api/search/route'
import { auth } from '@/auth'
import { searchUsStocks } from '@/lib/finnhub-client'
import { searchKrStocks } from '@/lib/yahoo-finance-client'
import { searchCrypto } from '@/lib/coingecko-client'

const mockAuth = auth as ReturnType<typeof vi.fn>
const mockSearchUsStocks = searchUsStocks as ReturnType<typeof vi.fn>
const mockSearchKrStocks = searchKrStocks as ReturnType<typeof vi.fn>
const mockSearchCrypto = searchCrypto as ReturnType<typeof vi.fn>

const AUTHED_SESSION = { user: { id: 'user-1', email: 'test@example.com' } }

function makeGetRequest(q: string, assetType: string) {
  return new NextRequest(
    `http://localhost/api/search?q=${encodeURIComponent(q)}&assetType=${assetType}`
  )
}

describe('GET /api/search', () => {
  beforeEach(() => vi.clearAllMocks())

  it('1. 비인증 요청 → 401', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await GET(makeGetRequest('AAPL', 'us-stock'))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error.code).toBe('UNAUTHORIZED')
  })

  it('2. q 파라미터 없음 → 400', async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION)
    const res = await GET(new NextRequest('http://localhost/api/search?assetType=us-stock'))
    expect(res.status).toBe(400)
  })

  it('3. assetType 파라미터 없음 → 400', async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION)
    const res = await GET(new NextRequest('http://localhost/api/search?q=AAPL'))
    expect(res.status).toBe(400)
  })

  it('4. us-stock → searchUsStocks 호출 후 결과 반환', async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION)
    const results = [{ ticker: 'AAPL', name: 'Apple Inc.' }]
    mockSearchUsStocks.mockResolvedValue(results)

    const res = await GET(makeGetRequest('AAPL', 'us-stock'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.results).toEqual(results)
    expect(mockSearchUsStocks).toHaveBeenCalledWith('AAPL')
  })

  it('5. kr-stock → searchKrStocks 호출 후 결과 반환', async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION)
    const results = [{ ticker: '005930', name: '삼성전자' }]
    mockSearchKrStocks.mockResolvedValue(results)

    const res = await GET(makeGetRequest('005930', 'kr-stock'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.results).toEqual(results)
    expect(mockSearchKrStocks).toHaveBeenCalledWith('005930')
  })

  it('6. crypto → searchCrypto 호출 후 결과 반환', async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION)
    const results = [{ ticker: 'BTC', name: 'Bitcoin' }]
    mockSearchCrypto.mockReturnValue(results)

    const res = await GET(makeGetRequest('BTC', 'crypto'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.results).toEqual(results)
    expect(mockSearchCrypto).toHaveBeenCalledWith('BTC')
  })

  it('7. 검색 오류 발생 시 빈 배열 반환 (graceful)', async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION)
    mockSearchUsStocks.mockRejectedValue(new Error('Network error'))

    const res = await GET(makeGetRequest('AAPL', 'us-stock'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.results).toEqual([])
  })
})
