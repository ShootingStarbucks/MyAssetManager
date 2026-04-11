import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import type { ApiError } from '@/types/api.types';

const USD_TO_KRW = 1380;

const addTransactionSchema = z.object({
  holdingId: z.string().min(1),
  type: z.enum(['BUY', 'SELL']),
  quantity: z.number().positive('수량은 0보다 커야 합니다'),
  price: z.number().positive('가격은 0보다 커야 합니다'),
  fee: z.number().min(0).optional(),
  date: z.string().optional(), // ISO string, defaults to now
  note: z.string().max(200).optional(),
});

/** 특정 보유 종목의 모든 거래 내역으로 quantity/avgCost 재계산 */
async function recalculateHolding(holdingId: string) {
  const txs = await prisma.transaction.findMany({
    where: { holdingId },
    orderBy: { date: 'asc' },
  });

  let qty = 0;
  let totalCost = 0;

  for (const tx of txs) {
    if (tx.type === 'BUY') {
      totalCost += tx.quantity * tx.price;
      qty += tx.quantity;
    } else {
      // SELL: 비율에 따라 평균 비용 차감
      if (qty > 0) {
        const costPerUnit = totalCost / qty;
        totalCost -= Math.min(tx.quantity, qty) * costPerUnit;
      }
      qty = Math.max(0, qty - tx.quantity);
    }
  }

  const avgCost = qty > 0 && totalCost > 0 ? totalCost / qty : null;

  await prisma.holding.update({
    where: { id: holdingId },
    data: {
      quantity: qty,
      avgCost: avgCost,
    },
  });

  return { quantity: qty, avgCost };
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } satisfies ApiError },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const holdingId = searchParams.get('holdingId');

  const transactions = await prisma.transaction.findMany({
    where: {
      userId: session.user.id,
      ...(holdingId ? { holdingId } : {}),
    },
    orderBy: { date: 'desc' },
  });

  return NextResponse.json({ transactions });
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
  const parsed = addTransactionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } satisfies ApiError },
      { status: 400 }
    );
  }

  const { holdingId, type, quantity, price, fee, date, note } = parsed.data;

  // 해당 holding이 본인 것인지 확인
  const holding = await prisma.holding.findUnique({ where: { id: holdingId } });
  if (!holding || holding.userId !== session.user.id) {
    return NextResponse.json(
      { error: { code: 'UNKNOWN', message: '자산을 찾을 수 없습니다' } satisfies ApiError },
      { status: 404 }
    );
  }

  // SELL의 경우 현재 보유 수량보다 많이 팔 수 없음
  if (type === 'SELL' && quantity > holding.quantity) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: `보유 수량(${holding.quantity})을 초과하여 매도할 수 없습니다` } satisfies ApiError },
      { status: 422 }
    );
  }

  const transaction = await prisma.transaction.create({
    data: {
      userId: session.user.id,
      holdingId,
      ticker: holding.ticker,
      assetType: holding.assetType,
      type,
      quantity,
      price,
      fee: fee ?? null,
      date: date ? new Date(date) : new Date(),
      note: note ?? null,
    },
  });

  // holding의 quantity/avgCost 재계산
  await recalculateHolding(holdingId);

  // BUY/SELL 시 현금 잔액 자동 연동
  const priceKRW = holding.assetType === 'us-stock' ? price * USD_TO_KRW : price;
  const feeKRW = fee ? (holding.assetType === 'us-stock' ? fee * USD_TO_KRW : fee) : 0;

  if (type === 'SELL') {
    // 매도: 현금 증가 (수수료 차감)
    const proceeds = priceKRW * quantity - feeKRW;
    await prisma.user.update({
      where: { id: session.user.id },
      data: { cashBalance: { increment: proceeds } },
    });
  } else {
    // 매수: 현금 차감 (수수료 포함)
    const cost = priceKRW * quantity + feeKRW;
    await prisma.user.update({
      where: { id: session.user.id },
      data: { cashBalance: { decrement: cost } },
    });
  }

  return NextResponse.json({ transaction }, { status: 201 });
}
