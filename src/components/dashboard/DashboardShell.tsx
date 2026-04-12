'use client';

import { signOut } from 'next-auth/react';
import { useSession } from 'next-auth/react';
import { AddHoldingForm } from './AddHoldingForm';
import { PortfolioSummaryCard } from './PortfolioSummaryCard';
import { PortfolioTable } from './PortfolioTable';
import { AllocationChart } from './AllocationChart';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';

export function DashboardShell() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">내 자산 관리</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{session?.user?.name ?? session?.user?.email}</span>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 왼쪽 패널: 요약 + 자산 추가 */}
          <div className="lg:col-span-1 space-y-4">
            <PortfolioSummaryCard />

            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-gray-700">자산 추가</h2>
              </CardHeader>
              <CardContent>
                <AddHoldingForm />
              </CardContent>
            </Card>
          </div>

          {/* 오른쪽 패널: 보유 자산 테이블 + 자산 비중 차트 */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-gray-700">보유 자산</h2>
              </CardHeader>
              <PortfolioTable />
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-gray-700">자산 비중</h2>
              </CardHeader>
              <CardContent className="px-2">
                <AllocationChart />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
