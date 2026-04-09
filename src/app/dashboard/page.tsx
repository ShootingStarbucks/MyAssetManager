import type { Metadata } from 'next';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

export const metadata: Metadata = {
  title: '대시보드 | 내 자산 관리',
};

export default function DashboardPage() {
  return <DashboardShell />;
}
