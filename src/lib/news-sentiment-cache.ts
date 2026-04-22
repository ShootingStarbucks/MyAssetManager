import { prisma } from '@/lib/prisma'
import type { SentimentLabel, NaverNewsItem, StockDetailResult } from '@/types/sentiment.types'

export const SENTIMENT_CACHE_TTL_MS = 60 * 60 * 1000

export async function getCachedSentiment(holdingId: string): Promise<StockDetailResult | null> {
  const record = await prisma.newsSentiment.findUnique({ where: { holdingId } })
  if (!record) return null
  if (Date.now() - record.analyzedAt.getTime() > SENTIMENT_CACHE_TTL_MS) return null

  return {
    holdingId: record.holdingId,
    ticker: record.ticker,
    sentiment: record.sentiment as SentimentLabel,
    score: record.score,
    summary: record.summary,
    keyReasons: JSON.parse(record.keyReasons) as string[],
    newsItems: JSON.parse(record.newsItems) as NaverNewsItem[],
    analyzedAt: record.analyzedAt.toISOString(),
    source: 'cache',
  }
}

export interface SaveSentimentInput {
  holdingId: string
  userId: string
  ticker: string
  sentiment: SentimentLabel
  score: number
  summary: string
  keyReasons: string[]
  newsItems: NaverNewsItem[]
}

export async function saveSentimentCache(input: SaveSentimentInput): Promise<void> {
  const keyReasons = JSON.stringify(input.keyReasons)
  const newsItems = JSON.stringify(input.newsItems)
  const analyzedAt = new Date()

  await prisma.newsSentiment.upsert({
    where: { holdingId: input.holdingId },
    create: {
      holdingId: input.holdingId,
      userId: input.userId,
      ticker: input.ticker,
      sentiment: input.sentiment,
      score: input.score,
      summary: input.summary,
      keyReasons,
      newsItems,
      analyzedAt,
    },
    update: {
      userId: input.userId,
      ticker: input.ticker,
      sentiment: input.sentiment,
      score: input.score,
      summary: input.summary,
      keyReasons,
      newsItems,
      analyzedAt,
    },
  })
}
