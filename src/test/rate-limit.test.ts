import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

describe('rateLimit() — sliding window', () => {
  let now: number

  beforeEach(() => {
    // 시간을 고정해 슬라이딩 윈도우 경계를 제어
    now = 1_000_000
    vi.spyOn(Date, 'now').mockReturnValue(now)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('1. 첫 요청은 항상 허용된다', () => {
    const result = rateLimit('test-ip-1', { windowMs: 60_000, max: 5 })
    expect(result.success).toBe(true)
    expect(result.remaining).toBe(4)
    expect(result.retryAfterMs).toBe(0)
  })

  it('2. max 이하의 요청은 모두 허용된다', () => {
    const opts = { windowMs: 60_000, max: 3 }
    const key = 'test-ip-2'
    expect(rateLimit(key, opts).success).toBe(true)
    expect(rateLimit(key, opts).success).toBe(true)
    const last = rateLimit(key, opts)
    expect(last.success).toBe(true)
    expect(last.remaining).toBe(0)
  })

  it('3. max 초과 요청은 거부된다 (success: false)', () => {
    const opts = { windowMs: 60_000, max: 2 }
    const key = 'test-ip-3'
    rateLimit(key, opts)
    rateLimit(key, opts)
    const result = rateLimit(key, opts)
    expect(result.success).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('4. 윈도우가 지나면 카운트가 초기화된다', () => {
    const opts = { windowMs: 60_000, max: 2 }
    const key = 'test-ip-4'
    rateLimit(key, opts)
    rateLimit(key, opts)
    expect(rateLimit(key, opts).success).toBe(false)

    // 윈도우(60초) 경과 후 시간 이동
    vi.spyOn(Date, 'now').mockReturnValue(now + 61_000)
    const result = rateLimit(key, opts)
    expect(result.success).toBe(true)
  })

  it('5. retryAfterMs는 양수이고 windowMs 이하다', () => {
    const opts = { windowMs: 60_000, max: 1 }
    const key = 'test-ip-5'
    rateLimit(key, opts) // 1회 소진
    const result = rateLimit(key, opts)
    expect(result.success).toBe(false)
    expect(result.retryAfterMs).toBeGreaterThan(0)
    expect(result.retryAfterMs).toBeLessThanOrEqual(60_000)
  })

  it('6. 서로 다른 키는 독립적으로 카운트된다', () => {
    const opts = { windowMs: 60_000, max: 1 }
    rateLimit('key-a', opts)
    expect(rateLimit('key-a', opts).success).toBe(false)
    // key-b는 아직 1회도 사용 안 했으므로 허용
    expect(rateLimit('key-b', opts).success).toBe(true)
  })

  it('7. 슬라이딩 윈도우 — 오래된 요청이 빠지면 다시 허용된다', () => {
    const opts = { windowMs: 10_000, max: 2 }
    const key = 'test-ip-7'

    // t=0: 요청 2회 → 소진
    vi.spyOn(Date, 'now').mockReturnValue(1_000_000)
    rateLimit(key, opts)
    rateLimit(key, opts)
    expect(rateLimit(key, opts).success).toBe(false)

    // t=5s: 아직 두 요청 모두 윈도우 안
    vi.spyOn(Date, 'now').mockReturnValue(1_005_000)
    expect(rateLimit(key, opts).success).toBe(false)

    // t=11s: 첫 번째 요청이 윈도우(10s) 밖으로 나감 → 슬롯 1개 회복
    vi.spyOn(Date, 'now').mockReturnValue(1_011_000)
    expect(rateLimit(key, opts).success).toBe(true)
  })
})

describe('getClientIp()', () => {
  it('1. x-forwarded-for 헤더에서 첫 번째 IP 추출', () => {
    const req = { headers: { get: (name: string) => name === 'x-forwarded-for' ? '1.2.3.4, 5.6.7.8' : null } }
    expect(getClientIp(req)).toBe('1.2.3.4')
  })

  it('2. x-forwarded-for 없으면 x-real-ip 사용', () => {
    const req = { headers: { get: (name: string) => name === 'x-real-ip' ? '9.10.11.12' : null } }
    expect(getClientIp(req)).toBe('9.10.11.12')
  })

  it('3. 둘 다 없으면 "unknown" 반환', () => {
    const req = { headers: { get: () => null } }
    expect(getClientIp(req)).toBe('unknown')
  })
})
