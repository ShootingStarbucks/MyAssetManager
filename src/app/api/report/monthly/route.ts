import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import type { ApiError } from '@/types/api.types';

type RiskProfile = 'AGGRESSIVE' | 'MODERATE' | 'CONSERVATIVE';

interface Breakdown {
  stockRatio: number;
  cryptoRatio: number;
  cashRatio: number;
}

function deriveRiskProfile(breakdown: Breakdown): RiskProfile {
  const { cryptoRatio, stockRatio } = breakdown;
  if (cryptoRatio >= 50) return 'AGGRESSIVE';
  if (cryptoRatio >= 30 || stockRatio >= 70) return 'MODERATE';
  return 'CONSERVATIVE';
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } satisfies ApiError },
      { status: 401 }
    );
  }

  const { searchParams } = req.nextUrl;
  const yearStr = searchParams.get('year');
  const monthStr = searchParams.get('month');

  const year = yearStr !== null ? Number(yearStr) : NaN;
  const month = monthStr !== null ? Number(monthStr) : NaN;

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'year와 month 파라미터가 올바르지 않습니다' } satisfies ApiError },
      { status: 400 }
    );
  }

  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 1));

  const userId = session.user.id;

  // Fetch snapshots for the requested month
  const snapshots = await prisma.portfolioSnapshot.findMany({
    where: {
      userId,
      snapDate: {
        gte: monthStart,
        lt: monthEnd,
      },
    },
    orderBy: { snapDate: 'asc' },
  });

  if (snapshots.length === 0) {
    return NextResponse.json(
      { error: '이달 데이터가 아직 없습니다' },
      { status: 404 }
    );
  }

  const firstSnapshot = snapshots[0];
  const lastSnapshot = snapshots[snapshots.length - 1];

  const totalAssetStart = firstSnapshot.totalValue;
  const totalAssetEnd = lastSnapshot.totalValue;
  const totalChange = totalAssetEnd - totalAssetStart;
  const totalChangePercent = totalAssetStart !== 0
    ? (totalChange / totalAssetStart) * 100
    : 0;

  // Parse last snapshot breakdown for byAssetClass
  let lastBreakdown: Breakdown = { stockRatio: 0, cryptoRatio: 0, cashRatio: 0 };
  try {
    lastBreakdown = JSON.parse(lastSnapshot.breakdown) as Breakdown;
  } catch {
    // keep defaults
  }

  const byAssetClass = {
    stock: lastBreakdown.stockRatio,
    crypto: lastBreakdown.cryptoRatio,
    cash: lastBreakdown.cashRatio,
  };

  // Risk profile: current from last snapshot, previous from second-to-last (or same if only one)
  const prevSnapshot = snapshots.length >= 2 ? snapshots[snapshots.length - 2] : lastSnapshot;
  let prevBreakdown: Breakdown = { stockRatio: 0, cryptoRatio: 0, cashRatio: 0 };
  try {
    prevBreakdown = JSON.parse(prevSnapshot.breakdown) as Breakdown;
  } catch {
    // keep defaults
  }

  const riskProfile = {
    current: deriveRiskProfile(lastBreakdown),
    previous: deriveRiskProfile(prevBreakdown),
  };

  // Best / worst holdings by return percent
  const holdings = await prisma.holding.findMany({
    where: { userId },
  });

  interface HoldingReturn {
    ticker: string;
    returnPercent: number;
  }

  const holdingsWithReturn: HoldingReturn[] = holdings
    .filter(
      (h: { currentPrice: number | null; avgCost: number | null }) =>
        h.currentPrice !== null && h.avgCost !== null && h.avgCost !== 0
    )
    .map((h: { ticker: string; currentPrice: number; avgCost: number }) => ({
      ticker: h.ticker,
      returnPercent: ((h.currentPrice - h.avgCost) / h.avgCost) * 100,
    }));

  holdingsWithReturn.sort((a: HoldingReturn, b: HoldingReturn) => b.returnPercent - a.returnPercent);

  const best = holdingsWithReturn.length > 0
    ? { ticker: holdingsWithReturn[0].ticker, returnPercent: holdingsWithReturn[0].returnPercent }
    : null;
  const worst = holdingsWithReturn.length > 0
    ? {
        ticker: holdingsWithReturn[holdingsWithReturn.length - 1].ticker,
        returnPercent: holdingsWithReturn[holdingsWithReturn.length - 1].returnPercent,
      }
    : null;

  // Rebalance check: targets stock 60 / crypto 20 / cash 20
  const targets = { stock: 60, crypto: 20, cash: 20 };
  const rebalanceNeeded =
    Math.abs(byAssetClass.stock - targets.stock) > 10 ||
    Math.abs(byAssetClass.crypto - targets.crypto) > 10 ||
    Math.abs(byAssetClass.cash - targets.cash) > 10;

  // Upcoming maturities: CashAccounts maturing within 30 days from now
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const maturingAccounts = await prisma.cashAccount.findMany({
    where: {
      userId,
      maturityDate: {
        not: null,
        lte: in30Days,
        gte: now,
      },
    },
    orderBy: { maturityDate: 'asc' },
  });

  const upcomingMaturities = maturingAccounts.map(
    (a: { institution: string; maturityDate: Date | null; amount: number }) => ({
      institution: a.institution,
      maturityDate: a.maturityDate!.toISOString(),
      amount: a.amount,
    })
  );

  return NextResponse.json({
    totalAssetStart,
    totalAssetEnd,
    totalChange,
    totalChangePercent,
    byAssetClass,
    best,
    worst,
    riskProfile,
    rebalanceNeeded,
    upcomingMaturities,
  });
}
