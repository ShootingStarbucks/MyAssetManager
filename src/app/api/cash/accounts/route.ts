import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const cashAccountSchema = z.object({
  institution: z.string().min(1),
  accountType: z.enum(['입출금', '정기예금', 'CMA', '적금', '기타']),
  amount: z.number().positive(),
  interestRate: z.number().optional(),
  maturityDate: z.string().optional(),
  memo: z.string().optional(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const accounts = await prisma.cashAccount.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json(accounts)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const data = cashAccountSchema.parse(body)
  const account = await prisma.cashAccount.create({
    data: {
      userId: session.user.id,
      ...data,
      maturityDate: data.maturityDate ? new Date(data.maturityDate) : undefined,
    },
  })
  return NextResponse.json(account, { status: 201 })
}
