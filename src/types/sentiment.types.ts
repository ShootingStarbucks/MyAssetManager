export type SentimentLabel = 'positive' | 'negative' | 'neutral'

export interface NaverNewsItem {
  title: string        // HTML 태그 제거된 제목
  description: string  // HTML 태그 제거된 설명
  pubDate: string      // RFC 2822 형식 날짜
  link: string         // 원본 뉴스 URL
}

export interface StockDetailResult {
  holdingId: string
  ticker: string
  sentiment: SentimentLabel | null
  score: number | null          // -1.0 ~ 1.0
  summary: string | null
  keyReasons: string[]
  newsItems: NaverNewsItem[]
  analyzedAt: string | null
  source: 'cache' | 'fresh'
  error?: string
}
