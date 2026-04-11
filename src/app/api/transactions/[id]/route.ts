import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import type { ApiError } from '@/types/api.types';

const USD_TO_KRW = 1380;

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

  const transaction = await prisma.transaction.findUnique({ where: { id } });
  if (!transaction || transaction.userId !== session.user.id) {
    return NextResponse.json(
      { error: { code: 'UNKNOWN', message: '거래 내역을 찾을 수 없습니다' } satisfies ApiError },
      { status: 404 }
    );
  }

  const holdingId = transaction.holdingId;

  // SELL 거래 삭제 시 현금 잔액 환원
  if (transaction.type === 'SELL') {
    const priceKRW = transaction.assetType === 'us-stock' ? transaction.price * USD_TO_KRW : transaction.price;
    const feeKRW = transaction.fee
      ? (transaction.assetType === 'us-stock' ? transaction.fee * USD_TO_KRW : transaction.fee)
      : 0;
    const proceeds = priceKRW * transaction.quantity - feeKRW;
    await prisma.user.update({
      where: { id: session.user.id },
      data: { cashBalance: { decrement: proceeds } },
    });
  }

  await prisma.transaction.delete({ where: { id } });

  // 삭제 후 holding 재계산
  await recalculateHolding(holdingId);

  return new NextResponse(null, { status: 204 });
}
