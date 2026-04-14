import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import type { ApiError } from '@/types/api.types';

// PATCH: mark all insights for current user as isStale=true
export async function PATCH() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } satisfies ApiError },
      { status: 401 }
    );
  }

  await prisma.insight.updateMany({
    where: { userId: session.user.id },
    data: { isStale: true },
  });

  return NextResponse.json({ ok: true });
}
