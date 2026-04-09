import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

// Edge Runtime 호환 - authConfig만 사용 (Prisma 없음)
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
