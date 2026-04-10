import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import type { ApiError } from '@/types/api.types';

const updateSchema = z.object({
  quantity: z.number().positive('수량은 0보다 커야 합니다').optional(),
  avgCost: z.number().positive().nullable().optional(),
}).refine(data => data.quantity !== undefined || 'avgCost' in data, {
  message: '수정할 항목이 없습니다',
});

export async function PATCH(
  req: NextRequest,
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
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } satisfies ApiError },
      { status: 400 }
    );
  }

  const holding = await prisma.holding.findUnique({ where: { id } });
  if (!holding || holding.userId !== session.user.id) {
    return NextResponse.json(
      { error: { code: 'UNKNOWN', message: '자산을 찾을 수 없습니다' } satisfies ApiError },
      { status: 404 }
    );
  }

  const updateData: { quantity?: number; avgCost?: number | null } = {};
  if (parsed.data.quantity !== undefined) updateData.quantity = parsed.data.quantity;
  if ('avgCost' in parsed.data) updateData.avgCost = parsed.data.avgCost;

  const updated = await prisma.holding.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({ holding: updated });
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

  const holding = await prisma.holding.findUnique({ where: { id } });
  if (!holding || holding.userId !== session.user.id) {
    return NextResponse.json(
      { error: { code: 'UNKNOWN', message: '자산을 찾을 수 없습니다' } satisfies ApiError },
      { status: 404 }
    );
  }

  await prisma.holding.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
