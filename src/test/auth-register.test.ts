import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock rate-limit so in-memory state doesn't bleed between tests
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(() => ({ success: true, remaining: 10, retryAfterMs: 0 })),
  getClientIp: vi.fn(() => '127.0.0.1'),
  rateLimitExceededResponse: vi.fn(() => ({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' })),
}))

// Mock @/lib/prisma before importing the route
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}))

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed_password'),
    compare: vi.fn(),
  },
}))

// Import after mocks are set up
import { POST } from '@/app/api/auth/register/route'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

const mockPrismaUser = prisma.user as {
  findUnique: ReturnType<typeof vi.fn>
  create: ReturnType<typeof vi.fn>
}
const mockBcrypt = bcrypt as unknown as { hash: ReturnType<typeof vi.fn> }

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('1. 성공 — 유효한 이메일/비밀번호/이름 → 201, { user: { id, email, name } }', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(null)
    mockPrismaUser.create.mockResolvedValue({
      id: 'user-id-1',
      email: 'test@example.com',
      name: '홍길동',
    })

    const req = makeRequest({ email: 'test@example.com', password: 'password123', name: '홍길동' })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json).toEqual({
      user: { id: 'user-id-1', email: 'test@example.com', name: '홍길동' },
    })
  })

  it('2. 이메일 중복 — DB에 이미 존재하는 이메일 → 409, { error: { message: "이미 사용 중인 이메일입니다" } }', async () => {
    mockPrismaUser.findUnique.mockResolvedValue({
      id: 'existing-id',
      email: 'test@example.com',
      name: '기존유저',
      password: 'hashed',
    })

    const req = makeRequest({ email: 'test@example.com', password: 'password123', name: '홍길동' })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error.message).toBe('이미 사용 중인 이메일입니다')
  })

  it('3. 비밀번호 6자 미만 → 400', async () => {
    const req = makeRequest({ email: 'test@example.com', password: '123', name: '홍길동' })
    const res = await POST(req)

    expect(res.status).toBe(400)
  })

  it('4. 잘못된 이메일 형식 → 400', async () => {
    const req = makeRequest({ email: 'not-an-email', password: 'password123', name: '홍길동' })
    const res = await POST(req)

    expect(res.status).toBe(400)
  })

  it('5. name 미포함 (optional 필드) → 201 성공', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(null)
    mockPrismaUser.create.mockResolvedValue({
      id: 'user-id-2',
      email: 'noname@example.com',
      name: null,
    })

    const req = makeRequest({ email: 'noname@example.com', password: 'password123' })
    const res = await POST(req)

    expect(res.status).toBe(201)
  })

  it('6. name 빈 문자열("") → 400 VALIDATION_ERROR', async () => {
    const req = makeRequest({ email: 'test@example.com', password: 'password123', name: '' })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error.code).toBe('VALIDATION_ERROR')
  })

  it('7. bcrypt.hash가 saltRounds=12로 호출됨 — 보안 설정 고정 검증', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(null)
    mockPrismaUser.create.mockResolvedValue({
      id: 'user-id-3',
      email: 'test@example.com',
      name: '홍길동',
    })
    mockBcrypt.hash.mockResolvedValue('hashed_password')

    const req = makeRequest({ email: 'test@example.com', password: 'password123', name: '홍길동' })
    await POST(req)

    expect(mockBcrypt.hash).toHaveBeenCalledWith('password123', 12)
  })
})
