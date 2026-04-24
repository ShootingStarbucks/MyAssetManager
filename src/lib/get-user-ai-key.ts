import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';

export class ServerKeyLimitError extends Error {
  constructor() {
    super('서버 공유 키는 하루 3회까지만 사용할 수 있습니다. 개인 API 키를 등록하면 제한 없이 이용할 수 있습니다.');
    this.name = 'ServerKeyLimitError';
  }
}

export async function getUserAiApiKey(userId: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  const user = await (prisma as any).user.findUnique({
    where: { id: userId },
    select: { googleAiApiKey: true, serverKeyUsageCount: true, serverKeyUsageDate: true },
  });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const encryptedKey = user?.googleAiApiKey as string | null | undefined;
  if (encryptedKey) {
    return decrypt(encryptedKey);
  }

  const today = new Date().toISOString().slice(0, 10);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const isNewDay = (user?.serverKeyUsageDate as string | null) !== today;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const currentCount = isNewDay ? 0 : ((user?.serverKeyUsageCount as number | null) ?? 0);

  if (currentCount >= 3) {
    throw new ServerKeyLimitError();
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  await (prisma as any).user.update({
    where: { id: userId },
    data: {
      serverKeyUsageCount: currentCount + 1,
      serverKeyUsageDate: today,
    },
  });

  return process.env.GOOGLE_AI_API_KEY!;
}
