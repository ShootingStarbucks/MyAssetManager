import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import type { ApiError } from '@/types/api.types';

const DEFAULT_ALLOCATIONS = { stock: 60, crypto: 20, cash: 20 };

const targetSchema = z.object({
  stock: z.number().min(0).max(100),
  crypto: z.number().min(0).max(100),
  cash: z.number().min(0).max(100),
}).refine(
  (data) => Math.abs(data.stock + data.crypto + data.cash - 100) <= 0.01,
  { message: 'stock + crypto + cash의 합계는 100이어야 합니다' }
);

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } satisfies ApiError },
      { status: 401 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { targetAllocations: true },
  });

  if (!user?.targetAllocations) {
    return NextResponse.json({ allocations: DEFAULT_ALLOCATIONS });
  }

  try {
    const allocations = JSON.parse(user.targetAllocations);
    return NextResponse.json({ allocations });
  } catch {
    return NextResponse.json({ allocations: DEFAULT_ALLOCATIONS });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } satisfies ApiError },
      { status: 401 }
    );
  }

  const body = await req.json();
  const parsed = targetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } satisfies ApiError },
      { status: 400 }
    );
  }

  const { stock, crypto, cash } = parsed.data;
  const allocations = { stock, crypto, cash };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { targetAllocations: JSON.stringify(allocations) },
  });

  return NextResponse.json({ allocations });
}
