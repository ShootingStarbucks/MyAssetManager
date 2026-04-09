import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authConfig } from './auth.config';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: '이메일', type: 'email' },
        password: { label: '비밀번호', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        const user = await prisma.user.findUnique({ where: { email } });
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (!user?.password) return null;

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const isValid = await bcrypt.compare(password, user.password as string);
        if (!isValid) return null;

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return { id: user.id as string, email: user.email as string, name: user.name as string };
      },
    }),
  ],
});
