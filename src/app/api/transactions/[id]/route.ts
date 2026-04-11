import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import type { ApiError } from '@/types/api.types';

const USD_TO_KRW = 1380;

/** 특정 보유 종목의 모든 거래 내역으로 quantity/avgCost 재계산 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function recalculateHolding(holdingId: string, tx: any) {
  const txs = await tx.transaction.findMany({
    where: { holdingId },
    orderBy: { date: 'asc' },
  });

  let qty = 0;
  let totalCost = 0;

  for (const t of txs) {
    if (t.type === 'BUY') {
      totalCost += t.quantity * t.price;
      qty += t.quantity;
    } else {
      if (qty > 0) {
        const costPerUnit = totalCost / qty;
        totalCost -= Math.min(t.quantity, qty) * costPerUnit;
      }
      qty = Math.max(0, qty - t.quantity);
    }
  }

  const avgCost = qty > 0 && totalCost > 0 ? totalCost / qty : null;

  await tx.holding.update({
    where: { id: holdingId },
    data: { quantity: qty, avgCost },
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } satisfies ApiError },
      { status: 401 }
    );
  }

  const { id } = await params;

  // 트랜잭션 밖에서 조회 — 소유권 검증
  const transaction = await prisma.transaction.findUnique({ where: { id } });
  if (!transaction || transaction.userId !== session.user.id) {
    return NextResponse.json(
      { error: { code: 'UNKNOWN', message: '거래 내역을 찾을 수 없습니다' } satisfies ApiError },
      { status: 404 }
    );
  }

  const holdingId = transaction.holdingId;
  const userId = session.user.id;
  const priceKRW = transaction.assetType === 'us-stock' ? transaction.price * USD_TO_KRW : transaction.price;
  const feeKRW = transaction.fee
    ? (transaction.assetType === 'us-stock' ? transaction.fee * USD_TO_KRW : transaction.fee)
    : 0;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await prisma.$transaction(async (tx: any) => {
      if (transaction.type === 'SELL') {
        // 매도 삭제: 현금 차감 (받았던 금액 환원)
        const proceeds = priceKRW * transaction.quantity - feeKRW;
        await tx.user.update({
          where: { id: userId },
          data: { cashBalance: { decrement: proceeds } },
        });
      } else {
        // 매수 삭제: 현금 증가 (썼던 금액 환원)
        const cost = priceKRW * transaction.quantity + feeKRW;
        await tx.user.update({
          where: { id: userId },
          data: { cashBalance: { increment: cost } },
        });
      }

      await tx.transaction.delete({ where: { id } });

      // 삭제 후 holding 재계산
      await recalculateHolding(holdingId, tx);
    });

    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json(
      { error: { code: 'UNKNOWN', message: '처리 중 오류가 발생했습니다.' } satisfies ApiError },
      { status: 500 }
    );
  }
}
