import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/finnhub-client', () => ({
  fetchUsStockHistoricalPrice: vi.fn(),
}))

vi.mock('@/lib/yahoo-finance-client', () => ({
  fetchKrStockHistoricalPrice: vi.fn(),
}))

vi.mock('@/lib/coingecko-client', () => ({
  fetchCryptoHistoricalPrice: vi.fn(),
}))

import { POST } from '@/app/api/historical-prices/route'
import { auth } from '@/auth'
import { fetchUsStockHistoricalPrice } from '@/lib/finnhub-client'
import { fetchKrStockHistoricalPrice } from '@/lib/yahoo-finance-client'
import { fetchCryptoHistoricalPrice } from '@/lib/coingecko-client'

const mockAuth = auth as ReturnType<typeof vi.fn>
const mockFetchUs = fetchUsStockHistoricalPrice as ReturnType<typeof vi.fn>
const mockFetchKr = fetchKrStockHistoricalPrice as ReturnType<typeof vi.fn>
const mockFetchCrypto = fetchCryptoHistoricalPrice as ReturnType<typeof vi.fn>

const AUTHED_SESSION = { user: { id: 'user-1' } }

const US_HISTORICAL = { ticker: 'AAPL', price: 150, currency: 'USD', date: '2024-01-15' }
const KR_HISTORICAL = { ticker: '005930', price: 70_000, currency: 'KRW', date: '2024-01-15' }
const CRYPTO_HISTORICAL = { ticker: 'BTC', price: 90_000_000, currency: 'KRW', date: '2024-01-15' }

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/historical-prices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/historical-prices', () => {
  beforeEach(() => vi.clearAllMocks())

  it('1. 비인증 요청 → 401', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await POST(
      makeRequest({ items: [{ ticker: 'AAPL', assetType: 'us-stock', date: '2024-01-15' }] })
    )
    expect(res.status).toBe(401)
  })

  it('2. items 누락 → 400 VALIDATION_ERROR', async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION)
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error.code).toBe('VALIDATION_ERROR')
  })

  it('3. 잘못된 날짜 형식 (YYYY-MM-DD 아님) → 400', async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION)
    const res = await POST(
      makeRequest({ items: [{ ticker: 'AAPL', assetType: 'us-stock', date: '20240115' }] })
    )
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error.code).toBe('VALIDATION_ERROR')
  })

  it('4. us-stock → fetchUsStockHistoricalPrice 호출, 결과 반환', async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION)
    mockFetchUs.mockResolvedValue(US_HISTORICAL)

    const res = await POST(
      makeRequest({ items: [{ ticker: 'AAPL', assetType: 'us-stock', date: '2024-01-15' }] })
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.results).toHaveLength(1)
    expect(json.results[0]).toMatchObject({ ticker: 'AAPL', price: 150, currency: 'USD', date: '2024-01-15' })
    expect(mockFetchUs).toHaveBeenCalledWith('AAPL', '2024-01-15')
  })

  it('5. kr-stock → fetchKrStockHistoricalPrice 호출, 결과 반환', async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION)
    mockFetchKr.mockResolvedValue(KR_HISTORICAL)

    const res = await POST(
      makeRequest({ items: [{ ticker: '005930', assetType: 'kr-stock', date: '2024-01-15' }] })
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.results[0]).toMatchObject({ ticker: '005930', price: 70_000, currency: 'KRW' })
    expect(mockFetchKr).toHaveBeenCalledWith('005930', '2024-01-15')
  })

  it('6. crypto → fetchCryptoHistoricalPrice 호출, 결과 반환', async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION)
    mockFetchCrypto.mockResolvedValue(CRYPTO_HISTORICAL)

    const res = await POST(
      makeRequest({ items: [{ ticker: 'BTC', assetType: 'crypto', date: '2024-01-15' }] })
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.results[0]).toMatchObject({ ticker: 'BTC', price: 90_000_000, currency: 'KRW' })
    expect(mockFetchCrypto).toHaveBeenCalledWith('BTC', '2024-01-15')
  })

  it('7. 혼합 자산 타입 → 각 클라이언트에 올바르게 분배', async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION)
    mockFetchUs.mockResolvedValue(US_HISTORICAL)
    mockFetchKr.mockResolvedValue(KR_HISTORICAL)
    mockFetchCrypto.mockResolvedValue(CRYPTO_HISTORICAL)

    const res = await POST(
      makeRequest({
        items: [
          { ticker: 'AAPL', assetType: 'us-stock', date: '2024-01-15' },
          { ticker: '005930', assetType: 'kr-stock', date: '2024-01-15' },
          { ticker: 'BTC', assetType: 'crypto', date: '2024-01-15' },
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

  it('8. us-stock API 실패 → price: null, error: NETWORK_ERROR (전체 실패 아님)', async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION)
    const err = new Error('Network failure') as NodeJS.ErrnoException
    mockFetchUs.mockRejectedValue(err)

    const res = await POST(
      makeRequest({ items: [{ ticker: 'AAPL', assetType: 'us-stock', date: '2024-01-15' }] })
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.results[0].price).toBeNull()
    expect(json.results[0].error).toBe('NETWORK_ERROR')
  })
})
