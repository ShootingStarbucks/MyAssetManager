import 'server-only';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { PrismaClient as _PrismaClient } from '../generated/prisma/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPrismaClient = any;
const PrismaClient = _PrismaClient as unknown as new (opts: { adapter: PrismaLibSql }) => AnyPrismaClient;

const globalForPrisma = globalThis as unknown as { prisma: AnyPrismaClient };

function createPrismaClient(): AnyPrismaClient {
  const adapter = new PrismaLibSql({
    url: process.env.DATABASE_URL ?? 'file:./prisma/dev.db',
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
