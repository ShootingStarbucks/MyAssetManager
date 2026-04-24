import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';

export async function getUserAiApiKey(userId: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { googleAiApiKey: true },
  });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const encryptedKey = user?.googleAiApiKey as string | null | undefined;
  if (encryptedKey) {
    return decrypt(encryptedKey);
  }

  return process.env.GOOGLE_AI_API_KEY!;
}
