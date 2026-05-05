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
  assetType: z.enum(['us-stock', 'kr-stock', 'crypto', 'us-etf', 'kr-etf', 'real-estate']),
  quantity: z.number().positive('수량은 0보다 커야 합니다'),
  avgCost: z.number().positive().optional(),
  name: z.string().max(100).optional(),
  exchange: z.enum(['KOSPI', 'KOSDAQ', 'NASDAQ', 'NYSE', 'ETC']).optional(),
  currency: z.enum(['KRW', 'USD']).default('KRW'),
  purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  memo: z.string().max(500).optional(),
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

  const { ticker, assetType, quantity, avgCost, name, exchange, currency, purchaseDate, memo } = parsed.data;

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
    if (assetType === 'us-stock' || assetType === 'us-etf') await fetchUsStockQuote(ticker);
    else if (assetType === 'kr-stock' || assetType === 'kr-etf') await fetchKrStockQuote(ticker);
    else if (assetType === 'crypto') await fetchCryptoQuotes([ticker]);
    // real-estate: no external API validation
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

  const userId = session.user!.id;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const holding = await prisma.$transaction(async (tx: any) => {
      const created = await tx.holding.create({
        data: { userId, ticker, assetType, quantity, avgCost, name, exchange, currency, purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined, memo },
      });
      await tx.transaction.create({
        data: {
          userId,
          holdingId: created.id,
          ticker: created.ticker,
          assetType: created.assetType,
          type: 'BUY',
          quantity,
          price: avgCost ?? 0,
          currency,
          note: '초기 보유량',
        },
      });
      return created;
    });
    return NextResponse.json({ holding }, { status: 201 });
  } catch (e: unknown) {
    // P2002: Unique constraint violation (같은 userId + ticker 조합)
    if (e && typeof e === 'object' && 'code' in e && (e as { code: unknown }).code === 'P2002') {
      return NextResponse.json(
        { error: { code: 'UNKNOWN', message: '이미 등록된 티커입니다' } satisfies ApiError },
        { status: 409 }
      );
    }
    console.error('[POST /api/holdings] prisma.holding.create 실패:', e);
    return NextResponse.json(
      { error: { code: 'UNKNOWN', message: '자산 등록에 실패했습니다' } satisfies ApiError },
      { status: 500 }
    );
  }
}
