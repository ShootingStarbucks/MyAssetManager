import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// We test the authorized callback logic from authConfig directly,
// since the middleware is just `export default auth` (NextAuth wrapper).
// The core protection logic lives in authConfig.callbacks.authorized.

// Mock next-auth so that NextAuth() captures the config
let capturedAuthConfig: Record<string, unknown> = {}
vi.mock('next-auth', () => ({
  default: vi.fn((config: Record<string, unknown>) => {
    capturedAuthConfig = config
    // Return a middleware-compatible function
    return vi.fn()
  }),
}))

// Import the authConfig to test the authorized callback
import { authConfig } from '@/auth.config'

// Helper: build a minimal auth-like object
function makeAuth(isLoggedIn: boolean) {
  if (!isLoggedIn) return null
  return { user: { id: 'u1', email: 'user@example.com', name: '홍길동' } }
}

// Helper: build a minimal NextRequest-like object for the callback
function makeRequestCtx(pathname: string) {
  return {
    nextUrl: new URL(`http://localhost${pathname}`),
  }
}

// The authorized callback from authConfig
type AuthorizedArgs = {
  auth: ReturnType<typeof makeAuth>
  request: ReturnType<typeof makeRequestCtx>
}

const authorizedCallback = (authConfig.callbacks as Record<string, unknown>).authorized as (
  args: AuthorizedArgs
) => boolean | Response | undefined

describe('middleware — authorized callback (authConfig)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('1. 미인증 상태로 /dashboard 접근 → false 반환 (NextAuth가 /login으로 리다이렉트)', () => {
    const result = authorizedCallback({
      auth: makeAuth(false),
      request: makeRequestCtx('/dashboard'),
    })

    // authorized() returning false causes NextAuth to redirect to signIn page
    expect(result).toBe(false)
  })

  it('2. 인증 상태로 /dashboard 접근 → true 반환 (통과)', () => {
    const result = authorizedCallback({
      auth: makeAuth(true),
      request: makeRequestCtx('/dashboard'),
    })

    expect(result).toBe(true)
  })

  it('3. /login 페이지 접근 → true 반환 (인증 불필요)', () => {
    const result = authorizedCallback({
      auth: makeAuth(false),
      request: makeRequestCtx('/login'),
    })

    // /login is not a dashboard route, so it always passes
    expect(result).toBe(true)
  })
})
