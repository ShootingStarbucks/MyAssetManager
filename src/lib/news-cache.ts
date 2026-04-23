import { prisma } from '@/lib/prisma'
import { fetchNaverNews } from '@/lib/naver-news-client'
import type { NaverNewsItem } from '@/types/sentiment.types'

const DEFAULT_MAX_AGE_MS = 6 * 60 * 60 * 1000

export interface CachedSentimentRecord {
  sentiment: string
  score: number
  summary: string
  keyReasons: string[]
  analyzedAt: string
}

export interface GetOrFetchNewsResult {
  newsItems: NaverNewsItem[]
  source: 'cache' | 'fresh'
  cachedRecord?: CachedSentimentRecord
}

export async function getOrFetchNews(
  ticker: string,
  query: string,
  maxAgeMs: number = DEFAULT_MAX_AGE_MS
): Promise<GetOrFetchNewsResult> {
  const cached = await (prisma as any).newsSentiment.findUnique({
    where: { ticker },
  })

  if (cached) {
    const age = Date.now() - new Date(cached.updatedAt).getTime()
    if (age < maxAgeMs) {
      let newsItems: NaverNewsItem[] = []
      try {
        newsItems = JSON.parse(cached.newsItems)
      } catch {
        // malformed cache — fall through to fresh fetch
      }
      if (newsItems.length > 0) {
        let keyReasons: string[] = []
        try {
          keyReasons = JSON.parse(cached.keyReasons)
        } catch {
          keyReasons = []
        }
        return {
          newsItems,
          source: 'cache',
          cachedRecord: {
            sentiment: cached.sentiment,
            score: cached.score,
            summary: cached.summary,
            keyReasons,
            analyzedAt: new Date(cached.analyzedAt).toISOString(),
          },
        }
      }
    }
  }

  let newsItems: NaverNewsItem[] = []
  try {
    newsItems = await fetchNaverNews(query, 8)
  } catch {
    // Naver API failure — return empty, caller handles gracefully
  }

  return { newsItems, source: 'fresh' }
}
