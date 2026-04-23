import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { PrismaLibSql } from '@prisma/adapter-libsql';
import { PrismaClient as _PrismaClient } from '../src/generated/prisma/client';
import bcrypt from 'bcryptjs';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PrismaClient = _PrismaClient as unknown as new (opts: { adapter: PrismaLibSql }) => any;

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL ?? 'file:./prisma/dev.db',
});
const prisma = new PrismaClient({ adapter });

function utcMidnight(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

async function main() {
  const EMAIL = 'test@myasset.dev';
  const PASSWORD = 'Test1234!';

  // 기존 유저 삭제 (cascade로 연관 데이터 모두 제거) — 재실행 가능하도록
  await prisma.user.deleteMany({ where: { email: EMAIL } });

  const hashedPassword = await bcrypt.hash(PASSWORD, 12);

  const user = await prisma.user.create({
    data: {
      email: EMAIL,
      name: '테스트 사용자',
      password: hashedPassword,
      cashBalance: 0,
      targetAllocations: JSON.stringify({ stock: 60, crypto: 20, cash: 20 }),
    },
  });

  console.log(`✅ 유저 생성: ${user.email}`);

  // ── 보유 자산 7종 ──────────────────────────────────────────────────────────
  const holdingsData = [
    {
      ticker: 'AAPL',
      assetType: 'us-stock',
      name: 'Apple Inc.',
      quantity: 10,
      avgCost: 180,
      currentPrice: 220,
      currency: 'USD',
      exchange: 'NASDAQ',
      purchaseDate: utcMidnight(2025, 3, 10),
    },
    {
      ticker: 'TSLA',
      assetType: 'us-stock',
      name: 'Tesla, Inc.',
      quantity: 5,
      avgCost: 200,
      currentPrice: 175,
      currency: 'USD',
      exchange: 'NASDAQ',
      purchaseDate: utcMidnight(2025, 6, 5),
    },
    {
      ticker: 'NVDA',
      assetType: 'us-stock',
      name: 'NVIDIA Corporation',
      quantity: 3,
      avgCost: 500,
      currentPrice: 850,
      currency: 'USD',
      exchange: 'NASDAQ',
      purchaseDate: utcMidnight(2025, 9, 20),
    },
    {
      ticker: '005930',
      assetType: 'kr-stock',
      name: '삼성전자',
      quantity: 100,
      avgCost: 75000,
      currentPrice: 68000,
      currency: 'KRW',
      exchange: 'KOSPI',
      purchaseDate: utcMidnight(2025, 1, 15),
    },
    {
      ticker: '000660',
      assetType: 'kr-stock',
      name: 'SK하이닉스',
      quantity: 30,
      avgCost: 200000,
      currentPrice: 230000,
      currency: 'KRW',
      exchange: 'KOSPI',
      purchaseDate: utcMidnight(2025, 4, 22),
    },
    {
      ticker: 'BTC',
      assetType: 'crypto',
      name: 'Bitcoin',
      quantity: 0.1,
      avgCost: 80000000,
      currentPrice: 90000000,
      currency: 'KRW',
      exchange: null,
      purchaseDate: utcMidnight(2025, 7, 1),
    },
    {
      ticker: 'ETH',
      assetType: 'crypto',
      name: 'Ethereum',
      quantity: 1,
      avgCost: 4000000,
      currentPrice: 3500000,
      currency: 'KRW',
      exchange: null,
      purchaseDate: utcMidnight(2025, 11, 12),
    },
  ];

  for (const h of holdingsData) {
    const holding = await prisma.holding.create({
      data: {
        userId: user.id,
        ticker: h.ticker,
        assetType: h.assetType,
        name: h.name,
        quantity: h.quantity,
        avgCost: h.avgCost,
        currentPrice: h.currentPrice,
        currency: h.currency,
        exchange: h.exchange,
        purchaseDate: h.purchaseDate,
      },
    });

    await prisma.transaction.create({
      data: {
        userId: user.id,
        holdingId: holding.id,
        ticker: h.ticker,
        assetType: h.assetType,
        type: 'BUY',
        quantity: h.quantity,
        price: h.avgCost,
        currency: h.currency,
        date: h.purchaseDate,
      },
    });

    console.log(`  📈 ${h.ticker} (${h.assetType}) 생성`);
  }

  // ── 현금 계좌 3종 ──────────────────────────────────────────────────────────
  await prisma.cashAccount.createMany({
    data: [
      {
        userId: user.id,
        institution: '국민은행',
        accountType: '정기예금',
        amount: 5000000,
        interestRate: 3.5,
        maturityDate: utcMidnight(2026, 5, 10), // 30일 이내 → 만기 알림 표시
        memo: '1년 만기 정기예금',
      },
      {
        userId: user.id,
        institution: '카카오뱅크',
        accountType: 'CMA',
        amount: 2000000,
        interestRate: 2.8,
        maturityDate: null,
        memo: '생활비 예비 자금',
      },
      {
        userId: user.id,
        institution: '한국투자증권',
        accountType: '적금',
        amount: 1000000,
        interestRate: 4.2,
        maturityDate: utcMidnight(2026, 9, 1),
        memo: '월 10만원 자동이체',
      },
    ],
  });

  console.log('  💰 현금 계좌 3종 생성');

  // ── 포트폴리오 스냅샷 (1월~4월) ───────────────────────────────────────────
  const snapshots = [
    // 1월
    { date: utcMidnight(2026, 1, 1),  total: 33000000, s: 52, c: 28, ca: 20 },
    { date: utcMidnight(2026, 1, 15), total: 34500000, s: 52, c: 28, ca: 20 },
    { date: utcMidnight(2026, 1, 31), total: 35800000, s: 53, c: 27, ca: 20 },
    // 2월
    { date: utcMidnight(2026, 2, 1),  total: 35800000, s: 52, c: 28, ca: 20 },
    { date: utcMidnight(2026, 2, 15), total: 37200000, s: 51, c: 29, ca: 20 },
    { date: utcMidnight(2026, 2, 28), total: 37800000, s: 50, c: 30, ca: 20 },
    // 3월
    { date: utcMidnight(2026, 3, 1),  total: 37800000, s: 50, c: 30, ca: 20 },
    { date: utcMidnight(2026, 3, 15), total: 40500000, s: 52, c: 28, ca: 20 },
    { date: utcMidnight(2026, 3, 31), total: 39200000, s: 51, c: 29, ca: 20 },
    // 4월
    { date: utcMidnight(2026, 4, 1),  total: 39200000, s: 50, c: 30, ca: 20 },
    { date: utcMidnight(2026, 4, 10), total: 40800000, s: 51, c: 29, ca: 20 },
    { date: utcMidnight(2026, 4, 22), total: 39434000, s: 49, c: 30, ca: 21 },
  ];

  await prisma.portfolioSnapshot.createMany({
    data: snapshots.map(({ date, total, s, c, ca }) => ({
      userId: user.id,
      totalValue: total,
      snapDate: date,
      breakdown: JSON.stringify({ stockRatio: s, cryptoRatio: c, cashRatio: ca }),
    })),
  });

  console.log('  📊 스냅샷 12개 생성 (2026년 1월~4월)');

  console.log('\n🎉 시드 완료!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`이메일 : ${EMAIL}`);
  console.log(`비밀번호: ${PASSWORD}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('❌ 시드 실패:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
