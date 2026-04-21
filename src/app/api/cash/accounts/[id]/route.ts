import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const patchSchema = z.object({
  institution: z.string().min(1).optional(),
  accountType: z.enum(['입출금', '정기예금', 'CMA', '적금', '기타']).optional(),
  amount: z.number().positive().optional(),
  interestRate: z.number().optional().nullable(),
  maturityDate: z.string().optional().nullable(),
  memo: z.string().optional().nullable(),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const data = patchSchema.parse(body)
  const { id } = await params
  const account = await prisma.cashAccount.findFirst({ where: { id, userId: session.user.id } })
  if (!account) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const updated = await prisma.cashAccount.update({
    where: { id },
    data: { ...data, maturityDate: data.maturityDate ? new Date(data.maturityDate) : data.maturityDate },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const account = await prisma.cashAccount.findFirst({ where: { id, userId: session.user.id } })
  if (!account) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await prisma.cashAccount.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
