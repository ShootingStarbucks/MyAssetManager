import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    holding: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

import { PATCH, DELETE } from '@/app/api/holdings/[id]/route'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

const mockAuth = auth as ReturnType<typeof vi.fn>
const mockHolding = prisma.holding as {
  findUnique: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
}

const AUTHED_SESSION = { user: { id: 'user-1', email: 'test@example.com' } }
const EXISTING_HOLDING = { id: 'h1', userId: 'user-1', ticker: 'AAPL', quantity: 5 }

function makePatchRequest(body: unknown) {
  return new NextRequest('http://localhost/api/holdings/h1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeDeleteRequest() {
  return new NextRequest('http://localhost/api/holdings/h1', { method: 'DELETE' })
}

const PARAMS = Promise.resolve({ id: 'h1' })

describe('PATCH /api/holdings/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('1. 비인증 요청 → 401', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await PATCH(makePatchRequest({ quantity: 3 }), { params: PARAMS })
    expect(res.status).toBe(401)
  })

  it('2. 성공 — 수량 업데이트 → 200, 업데이트된 holding 반환', async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION)
    mockHolding.findUnique.mockResolvedValue(EXISTING_HOLDING)
    const updated = { ...EXISTING_HOLDING, quantity: 10 }
    mockHolding.update.mockResolvedValue(updated)

    const res = await PATCH(makePatchRequest({ quantity: 10 }), { params: PARAMS })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.holding.quantity).toBe(10)
  })

  it('3. 수량 0 → 400 VALIDATION_ERROR', async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION)
    const res = await PATCH(makePatchRequest({ quantity: 0 }), { params: PARAMS })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error.code).toBe('VALIDATION_ERROR')
  })

  it('4. 존재하지 않는 holding → 404', async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION)
    mockHolding.findUnique.mockResolvedValue(null)

    const res = await PATCH(makePatchRequest({ quantity: 3 }), { params: PARAMS })
    expect(res.status).toBe(404)
  })

  it('5. 다른 사용자의 holding → 404 (소유권 확인)', async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION)
    mockHolding.findUnique.mockResolvedValue({ ...EXISTING_HOLDING, userId: 'other-user' })

    const res = await PATCH(makePatchRequest({ quantity: 3 }), { params: PARAMS })
    expect(res.status).toBe(404)
  })

  it('6. 올바른 id로 update가 호출된다', async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION)
    mockHolding.findUnique.mockResolvedValue(EXISTING_HOLDING)
    mockHolding.update.mockResolvedValue({ ...EXISTING_HOLDING, quantity: 7 })

    await PATCH(makePatchRequest({ quantity: 7 }), { params: PARAMS })

    expect(mockHolding.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'h1' }, data: { quantity: 7 } })
    )
  })
})

describe('DELETE /api/holdings/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('1. 비인증 요청 → 401', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await DELETE(makeDeleteRequest(), { params: PARAMS })
    expect(res.status).toBe(401)
  })

  it('2. 성공 → 204 No Content', async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION)
    mockHolding.findUnique.mockResolvedValue(EXISTING_HOLDING)
    mockHolding.delete.mockResolvedValue(EXISTING_HOLDING)

    const res = await DELETE(makeDeleteRequest(), { params: PARAMS })
    expect(res.status).toBe(204)
  })

  it('3. 존재하지 않는 holding → 404', async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION)
    mockHolding.findUnique.mockResolvedValue(null)

    const res = await DELETE(makeDeleteRequest(), { params: PARAMS })
    expect(res.status).toBe(404)
  })

  it('4. 다른 사용자의 holding → 404 (소유권 확인)', async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION)
    mockHolding.findUnique.mockResolvedValue({ ...EXISTING_HOLDING, userId: 'other-user' })

    const res = await DELETE(makeDeleteRequest(), { params: PARAMS })
    expect(res.status).toBe(404)
  })

  it('5. 올바른 id로 delete가 호출된다', async () => {
    mockAuth.mockResolvedValue(AUTHED_SESSION)
    mockHolding.findUnique.mockResolvedValue(EXISTING_HOLDING)
    mockHolding.delete.mockResolvedValue(EXISTING_HOLDING)

    await DELETE(makeDeleteRequest(), { params: PARAMS })

    expect(mockHolding.delete).toHaveBeenCalledWith({ where: { id: 'h1' } })
  })
})
