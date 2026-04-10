import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use vi.hoisted() to declare variables that can be used in vi.mock() factories
const { capturedConfig } = vi.hoisted(() => {
  const capturedConfig: { providers?: unknown[] } = {}
  return { capturedConfig }
})

// Mock @/lib/prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}))

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}))

// Capture the NextAuth config so we can extract the authorize function
vi.mock('next-auth', () => ({
  default: vi.fn((config: { providers?: unknown[] }) => {
    capturedConfig.providers = config.providers
    return {
      handlers: {},
      auth: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    }
  }),
}))

vi.mock('next-auth/providers/credentials', () => ({
  default: vi.fn((opts: Record<string, unknown>) => ({ ...opts, type: 'credentials' })),
}))

// Import auth module — this triggers NextAuth() call which populates capturedConfig
import '@/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

const mockPrismaUser = prisma.user as { findUnique: ReturnType<typeof vi.fn> }
const mockBcrypt = bcrypt as { compare: ReturnType<typeof vi.fn> }

// Helper to extract the authorize function from the captured Credentials provider config
type AuthorizeResult = { id: string; email: string; name: string } | null
type AuthorizeFn = (credentials: Record<string, string>) => Promise<AuthorizeResult>

function getAuthorize(): AuthorizeFn {
  const providers = capturedConfig.providers as Array<Record<string, unknown>>
  const credentialsProvider = providers[0] as Record<string, unknown>
  return credentialsProvider.authorize as AuthorizeFn
}

describe('auth.ts — authorize() 콜백', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('1. 성공 — 올바른 이메일/비밀번호 → { id, email, name } 반환', async () => {
    mockPrismaUser.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      name: '홍길동',
      password: 'hashed_pw',
    })
    mockBcrypt.compare.mockResolvedValue(true)

    const authorize = getAuthorize()
    const result = await authorize({ email: 'user@example.com', password: 'correctpass' })

    expect(result).toEqual({ id: 'user-1', email: 'user@example.com', name: '홍길동' })
  })

  it('2. 존재하지 않는 이메일 → null 반환', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(null)

    const authorize = getAuthorize()
    const result = await authorize({ email: 'nobody@example.com', password: 'password123' })

    expect(result).toBeNull()
  })

  it('3. 잘못된 비밀번호 → null 반환', async () => {
    mockPrismaUser.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      name: '홍길동',
      password: 'hashed_pw',
    })
    mockBcrypt.compare.mockResolvedValue(false)

    const authorize = getAuthorize()
    const result = await authorize({ email: 'user@example.com', password: 'wrongpass' })

    expect(result).toBeNull()
  })

  it('4. 유효성 실패 — 비밀번호 5자 → null 반환', async () => {
    const authorize = getAuthorize()
    const result = await authorize({ email: 'user@example.com', password: '12345' })

    expect(result).toBeNull()
  })
})
