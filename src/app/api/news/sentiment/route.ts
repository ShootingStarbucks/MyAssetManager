import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { buildNewsQuery } from '@/lib/news-query-builder'
import { getOrFetchNews } from '@/lib/news-cache'
import { analyzeSentiment } from '@/lib/sentiment-analyzer'
import type { StockDetailResult, SentimentLabel } from '@/types/sentiment.types'

const BodySchema = z.object({
  holdingId: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
  }
  const userId = session.user.id

  let body: { holdingId: string }
  try {
    const raw = await req.json()
    body = BodySchema.parse(raw)
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 })
  }

  const { holdingId } = body

  const holding = await (prisma as any).holding.findUnique({
    where: { id: holdingId },
  })

  if (!holding || holding.userId !== userId) {
    return NextResponse.json({ error: '자산을 찾을 수 없습니다' }, { status: 404 })
  }

  const query = buildNewsQuery({
    ticker: holding.ticker,
    assetType: holding.assetType as 'us-stock' | 'kr-stock' | 'crypto',
    name: holding.name,
  })

  const { newsItems, source, cachedRecord } = await getOrFetchNews(holdingId, query)

  if (source === 'cache' && cachedRecord) {
    const result: StockDetailResult = {
      holdingId,
      ticker: holding.ticker,
      sentiment: cachedRecord.sentiment as SentimentLabel,
      score: cachedRecord.score,
      summary: cachedRecord.summary,
      keyReasons: cachedRecord.keyReasons,
      newsItems,
      analyzedAt: cachedRecord.analyzedAt,
      source: 'cache',
    }
    return NextResponse.json(result)
  }

  const analysis = await analyzeSentiment(holding.ticker, holding.name ?? holding.ticker, newsItems)

  await (prisma as any).newsSentiment.upsert({
    where: { holdingId },
    create: {
      holdingId,
      userId,
      ticker: holding.ticker,
      sentiment: analysis.sentiment,
      score: analysis.score,
      summary: analysis.summary,
      keyReasons: JSON.stringify(analysis.keyReasons),
      newsItems: JSON.stringify(newsItems),
    },
    update: {
      sentiment: analysis.sentiment,
      score: analysis.score,
      summary: analysis.summary,
      keyReasons: JSON.stringify(analysis.keyReasons),
      newsItems: JSON.stringify(newsItems),
      analyzedAt: new Date(),
    },
  })

  const result: StockDetailResult = {
    holdingId,
    ticker: holding.ticker,
    sentiment: analysis.sentiment,
    score: analysis.score,
    summary: analysis.summary,
    keyReasons: analysis.keyReasons,
    newsItems,
    analyzedAt: new Date().toISOString(),
    source: 'fresh',
  }

  return NextResponse.json(result)
}
