import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

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

const mockPrismaUser = prisma.user as {
  findUnique: ReturnType<typeof vi.fn>
  create: ReturnType<typeof vi.fn>
}

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
})
