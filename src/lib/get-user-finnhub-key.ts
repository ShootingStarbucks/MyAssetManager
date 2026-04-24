import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';

/**
 * Returns the decrypted personal Finnhub key for the user, or null if not set.
 * Callers must fall back to the server FINNHUB_API_KEY or restrict functionality.
 */
export async function getUserFinnhubKey(userId: string): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  const user = await (prisma as any).user.findUnique({
    where: { id: userId },
    select: { finnhubApiKey: true },
  });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const encrypted = user?.finnhubApiKey as string | null | undefined;
  if (!encrypted) return null;
  try {
    return decrypt(encrypted);
  } catch {
    return null;
  }
}
