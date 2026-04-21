import type { Metadata } from 'next';
import { MonthlyReportPage } from '@/components/report/MonthlyReportPage';

export const metadata: Metadata = {
  title: '월간 리포트 | 내 자산 관리',
};

export default function ReportPage() {
  return <MonthlyReportPage />;
}
