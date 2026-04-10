import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { fetchUsStockQuote } from '@/lib/finnhub-client';
import { fetchKrStockQuote } from '@/lib/yahoo-finance-client';
import { fetchCryptoQuotes } from '@/lib/coingecko-client';
import type { ApiError } from '@/types/api.types';

const MAX_HOLDINGS = 20;

const addHoldingSchema = z.object({
  ticker: z.string().min(1).max(20).transform((v: string) => v.toUpperCase().trim()),
  assetType: z.enum(['us-stock', 'kr-stock', 'crypto']),
  quantity: z.number().positive('수량은 0보다 커야 합니다'),
  avgCost: z.number().positive().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } satisfies ApiError },
      { status: 401 }
    );
  }

  const holdings = await prisma.holding.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ holdings });
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
  const parsed = addHoldingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } satisfies ApiError },
      { status: 400 }
    );
  }

  const { ticker, assetType, quantity, avgCost } = parsed.data;

  // 최대 보유 자산 수 제한
  const count = await prisma.holding.count({ where: { userId: session.user.id } });
  if (count >= MAX_HOLDINGS) {
    return NextResponse.json(
      { error: { code: 'UNKNOWN', message: `최대 ${MAX_HOLDINGS}개까지 등록할 수 있습니다` } satisfies ApiError },
      { status: 422 }
    );
  }

  // 티커 유효성 검증 (외부 API 호출)
  try {
    if (assetType === 'us-stock') await fetchUsStockQuote(ticker);
    else if (assetType === 'kr-stock') await fetchKrStockQuote(ticker);
    else await fetchCryptoQuotes([ticker]);
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === 'INVALID_TICKER') {
      return NextResponse.json(
        { error: { code: 'INVALID_TICKER', message: '존재하지 않는 종목 코드입니다.' } satisfies ApiError },
        { status: 422 }
      );
    }
    // NETWORK_ERROR / RATE_LIMITED: 검증 불가 상태이므로 저장 허용
  }

  try {
    const holding = await prisma.holding.create({
      data: { userId: session.user.id, ticker, assetType, quantity, avgCost },
    });
    return NextResponse.json({ holding }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: { code: 'UNKNOWN', message: '이미 등록된 티커입니다' } satisfies ApiError },
      { status: 409 }
    );
  }
}
