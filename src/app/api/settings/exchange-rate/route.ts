import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { fetchUsdToKrw } from '@/lib/exchange-rate-client';
import type { ApiError } from '@/types/api.types';

const updateExchangeRateSchema = z.object({
  exchangeRate: z.number().positive('환율은 0보다 커야 합니다'),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } satisfies ApiError },
      { status: 401 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { exchangeRateUSDKRW: true },
  });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const dbRate = (user?.exchangeRateUSDKRW as number | null) ?? null;

  const liveRate = dbRate === null ? await fetchUsdToKrw() : null;
  return NextResponse.json({
    exchangeRate: dbRate,
    resolvedRate: dbRate ?? liveRate ?? 1380,
  });
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
  const parsed = updateExchangeRateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } satisfies ApiError },
      { status: 400 }
    );
  }

  const { exchangeRate } = parsed.data;

  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: { exchangeRateUSDKRW: exchangeRate },
      select: { exchangeRateUSDKRW: true },
    });

    return NextResponse.json({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      exchangeRate: updated.exchangeRateUSDKRW as number,
    });
  } catch (e: unknown) {
    console.error('[POST /api/settings/exchange-rate] prisma.user.update 실패:', e);
    return NextResponse.json(
      { error: { code: 'UNKNOWN', message: '환율 저장에 실패했습니다' } satisfies ApiError },
      { status: 500 }
    );
  }
}
