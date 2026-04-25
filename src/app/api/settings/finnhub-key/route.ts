import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { encrypt, decrypt } from '@/lib/crypto';
import type { ApiError } from '@/types/api.types';

const saveKeySchema = z.object({
  apiKey: z.string().min(1, 'API 키를 입력해주세요'),
});

function maskKey(key: string): string {
  if (key.length <= 8) return '****';
  return key.slice(0, 4) + '...' + key.slice(-4);
}

async function validateFinnhubKey(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=AAPL&token=${encodeURIComponent(apiKey)}`
    );
    if (!res.ok) return false;
    const data = (await res.json()) as { c?: number };
    return typeof data.c === 'number' && data.c > 0;
  } catch {
    return false;
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } satisfies ApiError },
      { status: 401 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  const user = await (prisma as any).user.findUnique({
    where: { id: session.user.id },
    select: { finnhubApiKey: true },
  });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const encryptedKey = user?.finnhubApiKey as string | null | undefined;

  if (!encryptedKey) {
    return NextResponse.json({ hasKey: false, maskedKey: null });
  }

  try {
    const plainKey = decrypt(encryptedKey);
    return NextResponse.json({ hasKey: true, maskedKey: maskKey(plainKey) });
  } catch {
    return NextResponse.json({ hasKey: false, maskedKey: null });
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
  const parsed = saveKeySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } satisfies ApiError },
      { status: 400 }
    );
  }

  const { apiKey } = parsed.data;

  const isValid = await validateFinnhubKey(apiKey);
  if (!isValid) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: '유효하지 않은 API 키입니다. Finnhub에서 발급한 키를 확인해주세요.' } satisfies ApiError },
      { status: 400 }
    );
  }

  const encryptedKey = encrypt(apiKey);

  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await (prisma as any).user.update({
      where: { id: session.user.id },
      data: { finnhubApiKey: encryptedKey },
    });

    return NextResponse.json({ success: true, maskedKey: maskKey(apiKey) });
  } catch (e: unknown) {
    console.error('[POST /api/settings/finnhub-key] prisma.user.update 실패:', e);
    return NextResponse.json(
      { error: { code: 'UNKNOWN', message: 'API 키 저장에 실패했습니다' } satisfies ApiError },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } satisfies ApiError },
      { status: 401 }
    );
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await (prisma as any).user.update({
      where: { id: session.user.id },
      data: { finnhubApiKey: null },
    });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    console.error('[DELETE /api/settings/finnhub-key] prisma.user.update 실패:', e);
    return NextResponse.json(
      { error: { code: 'UNKNOWN', message: 'API 키 삭제에 실패했습니다' } satisfies ApiError },
      { status: 500 }
    );
  }
}
