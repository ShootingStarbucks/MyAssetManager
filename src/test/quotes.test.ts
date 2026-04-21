import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/finnhub-client', () => ({
  fetchUsStockQuote: vi.fn(),
}))

vi.mock('@/lib/yahoo-finance-client', () => ({
  fetchKrStockQuote: vi.fn(),
}))

vi.mock('@/lib/coingecko-client', () => ({
  fetchCryptoQuotes: vi.fn(),
}))

import { POST } from '@/app/api/quotes/route'
import { auth } from '@/auth'
import { fetchUsStockQuote } from '@/lib/finnhub-client'
import { fetchKrStockQuote } from '@/lib/yahoo-finance-client'
import { fetchCryptoQuotes } from '@/lib/coingecko-client'

const mockAuth = auth as ReturnType<typeof vi.fn>
const mockFetchUs = fetchUsStockQuote as ReturnType<typeof vi.fn>
const mockFetchKr = fetchKrStockQuote as ReturnType<typeof vi.fn>
const mockFetchCrypto = fetchCryptoQuotes as ReturnType<typeof vi.fn>

const AUTHED_SESSION = { user: { id: 'user-1' } }

const US_QUOTE = { ticker: 'AAPL', price: 200, change: 5, changePercent: 2.5, currency: 'USD' }
const KR_QUOTE = { ticker: '005930', price: 70_000, change: 500, changePercent: 0.72, currency: 'KRW' }
const BTC_QUOTE = { ticker: 'BTC', price: 130_000_000, change: 1_000_000, changePercent: 0.77, currency: 'KRW' }

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/quotes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/quotes', () => {
  beforeEach(() => vi.clearAllMocks())

  it('1. 비인증 요청 → 401', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await POST(makeRequest({ holdings: [{ ticker: 'AAPL', assetType: 'us-stock' }] }))
    expect(res.status).toBe(401)
  })

  it('2. holdings 누락 → 400 VALIDATION_ERROR', async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION)
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error.code).toBe('VALIDATION_ERROR')
  })

  it('3. 미국 주식 → fetchUsStockQuote 호출, 결과 반환', async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION)
    mockFetchUs.mockResolvedValue(US_QUOTE)

    const res = await POST(makeRequest({ holdings: [{ ticker: 'AAPL', assetType: 'us-stock' }] }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.results).toHaveLength(1)
    expect(json.results[0]).toEqual({ ticker: 'AAPL', quote: US_QUOTE })
    expect(mockFetchUs).toHaveBeenCalledWith('AAPL')
  })

  it('4. 한국 주식 → fetchKrStockQuote 호출, 결과 반환', async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION)
    mockFetchKr.mockResolvedValue(KR_QUOTE)

    const res = await POST(makeRequest({ holdings: [{ ticker: '005930', assetType: 'kr-stock' }] }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.results[0]).toEqual({ ticker: '005930', quote: KR_QUOTE })
    expect(mockFetchKr).toHaveBeenCalledWith('005930')
  })

  it('5. 암호화폐 → fetchCryptoQuotes 배치 호출, 결과 반환', async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION)
    mockFetchCrypto.mockResolvedValue([BTC_QUOTE])

    const res = await POST(makeRequest({ holdings: [{ ticker: 'BTC', assetType: 'crypto' }] }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.results[0]).toEqual({ ticker: 'BTC', quote: BTC_QUOTE })
    expect(mockFetchCrypto).toHaveBeenCalledWith(['BTC'])
  })

  it('6. 혼합 자산 타입 — 각 클라이언트에 올바르게 분배', async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION)
    mockFetchUs.mockResolvedValue(US_QUOTE)
    mockFetchKr.mockResolvedValue(KR_QUOTE)
    mockFetchCrypto.mockResolvedValue([BTC_QUOTE])

    const res = await POST(
      makeRequest({
        holdings: [
          { ticker: 'AAPL', assetType: 'us-stock' },
          { ticker: '005930', assetType: 'kr-stock' },
          { ticker: 'BTC', assetType: 'crypto' },
        ],
      })
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.results).toHaveLength(3)
    expect(mockFetchUs).toHaveBeenCalledTimes(1)
    expect(mockFetchKr).toHaveBeenCalledTimes(1)
    expect(mockFetchCrypto).toHaveBeenCalledTimes(1)
  })

  it('7. 미국 주식 API 실패 → error: NETWORK_ERROR, quote: null로 반환 (전체 실패 아님)', async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION)
    const err = new Error('Network failure') as NodeJS.ErrnoException
    mockFetchUs.mockRejectedValue(err)

    const res = await POST(makeRequest({ holdings: [{ ticker: 'AAPL', assetType: 'us-stock' }] }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.results[0].quote).toBeNull()
    expect(json.results[0].error).toBe('NETWORK_ERROR')
  })

  it('8. 암호화폐 배치 API 실패 → 모든 코인에 NETWORK_ERROR', async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION)
    mockFetchCrypto.mockRejectedValue(new Error('CoinGecko down'))

    const res = await POST(
      makeRequest({
        holdings: [
          { ticker: 'BTC', assetType: 'crypto' },
          { ticker: 'ETH', assetType: 'crypto' },
        ],
      })
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.results).toHaveLength(2)
    json.results.forEach((r: { quote: null; error: string }) => {
      expect(r.quote).toBeNull()
      expect(r.error).toBe('NETWORK_ERROR')
    })
  })

  it('9. 빈 holdings 배열 → 200, 빈 results', async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION)

    const res = await POST(makeRequest({ holdings: [] }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.results).toEqual([])
  })
})
