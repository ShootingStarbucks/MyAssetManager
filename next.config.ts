import type { NextConfig } from 'next';
import os from 'os';

function getLocalIp(): string {
  const interfaces = os.networkInterfaces();
  for (const ifaces of Object.values(interfaces)) {
    for (const iface of ifaces ?? []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const localIp = getLocalIp();
const port = process.env.PORT ?? '3000';

// AUTH_URL이 없으면 현재 머신 IP로 자동 설정 (IP 접속 시 Auth.js 콜백 URL 오류 방지)
if (!process.env.AUTH_URL && !process.env.NEXTAUTH_URL) {
  process.env.AUTH_URL = `http://${localIp}:${port}`;
}

const nextConfig: NextConfig = {
  // 사설 IP 대역에서의 cross-origin 개발 서버 접근 허용 (모바일/다른 기기 테스트용)
  allowedDevOrigins: [localIp],
};

export default nextConfig;
