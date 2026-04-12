import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { rateLimit, getClientIp, rateLimitExceededResponse } from '@/lib/rate-limit';
import { emailSchema, passwordSchema } from '@/lib/auth-schemas';

// 15분당 5회
const REGISTER_LIMIT = { windowMs: 15 * 60 * 1000, max: 5 };

const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.preprocess((v) => (v === '' ? undefined : v), z.string().optional()),
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const limit = rateLimit(`register:${ip}`, REGISTER_LIMIT);
  if (!limit.success) {
    return NextResponse.json(rateLimitExceededResponse(), {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil(limit.retryAfterMs / 1000)) },
    });
  }

  const body = await req.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } },
      { status: 400 }
    );
  }

  const { email, password, name } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: { code: 'EMAIL_TAKEN', message: '이미 사용 중인 이메일입니다' } },
      { status: 409 }
    );
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, password: hashedPassword, name },
    select: { id: true, email: true, name: true },
  });

  return NextResponse.json({ user }, { status: 201 });
}
