import type { NaverNewsItem } from '@/types/sentiment.types'

const NAVER_NEWS_URL = 'https://openapi.naver.com/v1/search/news.json'

// Strip HTML tags and common entities that Naver API returns in title/description
function stripHtml(str: string): string {
  return str
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'")
}

export async function fetchNaverNews(query: string, display: number = 10): Promise<NaverNewsItem[]> {
  const url = `${NAVER_NEWS_URL}?query=${encodeURIComponent(query)}&display=${display}&sort=date`

  const response = await fetch(url, {
    headers: {
      'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID ?? '',
      'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET ?? '',
    },
  })

  if (!response.ok) {
    throw new Error('NETWORK_ERROR')
  }

  const data = await response.json()

  if (!data.items || data.items.length === 0) {
    return []
  }

  return data.items.map((item: NaverNewsItem) => ({
    title: stripHtml(item.title),
    description: stripHtml(item.description),
    pubDate: item.pubDate,
    link: item.link,
  }))
}
