import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import type { ApiError } from '@/types/api.types';

const snapshotSchema = z.object({
  totalValue: z.number().nonnegative(),
  breakdown: z.object({
    stockRatio: z.number().min(0).max(100),
    cryptoRatio: z.number().min(0).max(100),
    cashRatio: z.number().min(0).max(100),
  }),
});

function todayMidnightUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } satisfies ApiError },
      { status: 401 }
    );
  }

  const snapshots = await prisma.portfolioSnapshot.findMany({
    where: { userId: session.user.id },
    orderBy: { snapDate: 'desc' },
    take: 12,
  });

  return NextResponse.json({ snapshots });
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
  const parsed = snapshotSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } satisfies ApiError },
      { status: 400 }
    );
  }

  const { totalValue, breakdown } = parsed.data;
  const userId = session.user.id;
  const snapDate = todayMidnightUTC();
  const breakdownJson = JSON.stringify(breakdown);

  // Find existing snapshot for today
  const existing = await prisma.portfolioSnapshot.findFirst({
    where: {
      userId,
      snapDate,
    },
  });

  let snapshot;
  if (existing) {
    snapshot = await prisma.portfolioSnapshot.update({
      where: { id: existing.id },
      data: { totalValue, breakdown: breakdownJson },
    });
  } else {
    snapshot = await prisma.portfolioSnapshot.create({
      data: { userId, totalValue, snapDate, breakdown: breakdownJson },
    });
  }

  return NextResponse.json({ snapshot }, { status: existing ? 200 : 201 });
}
