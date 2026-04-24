import { GoogleGenerativeAI } from '@google/generative-ai'
import type { NaverNewsItem, SentimentLabel } from '@/types/sentiment.types'

const FALLBACK_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite']

const SYSTEM_INSTRUCTION =
  '당신은 주식/코인 뉴스 감성 분석 전문가입니다. 제공된 뉴스 제목과 설명을 읽고 해당 자산의 시장 감성을 분석하세요.\n\n[출력 형식 — 반드시 아래 JSON으로만 응답]\n{\n  "sentiment": "positive" | "negative" | "neutral",\n  "score": -1.0부터 1.0 사이의 소수점 숫자,\n  "summary": "전체 뉴스를 한 문장으로 요약",\n  "keyReasons": ["주요 이유 1", "주요 이유 2", "주요 이유 3"]\n}'

export interface SentimentAnalysisResult {
  sentiment: SentimentLabel
  score: number
  summary: string
  keyReasons: string[]
}

const NEUTRAL_RESULT: SentimentAnalysisResult = {
  sentiment: 'neutral',
  score: 0,
  summary: '관련 뉴스를 찾을 수 없습니다.',
  keyReasons: [],
}

export async function analyzeSentiment(
  ticker: string,
  assetName: string,
  newsItems: NaverNewsItem[],
  apiKey?: string
): Promise<SentimentAnalysisResult> {
  if (newsItems.length === 0) {
    return NEUTRAL_RESULT
  }

  const newsText = newsItems
    .map((item, i) => `[${i + 1}] 제목: ${item.title}\n설명: ${item.description}`)
    .join('\n\n')

  const userPrompt = `종목: ${assetName} (${ticker})\n\n최근 뉴스:\n${newsText}`

  const genAI = new GoogleGenerativeAI(apiKey ?? process.env.GOOGLE_AI_API_KEY!)

  let rawText: string | undefined
  for (const modelName of FALLBACK_MODELS) {
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: SYSTEM_INSTRUCTION,
    })
    try {
      const result = await model.generateContent(userPrompt)
      rawText = result.response.text()
      if (modelName !== FALLBACK_MODELS[0]) {
        console.warn(`[analyzeSentiment] Using fallback model: ${modelName}`)
      }
      break
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.warn(`[analyzeSentiment] Model ${modelName} failed: ${msg.split('\n')[0]}`)
    }
  }

  if (rawText === undefined) {
    console.error('[analyzeSentiment] All Gemini models failed, returning neutral fallback')
    return { sentiment: 'neutral', score: 0, summary: '감성 분석에 실패했습니다.', keyReasons: [] }
  }

  try {
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    const parsed = JSON.parse(cleaned)
    return {
      sentiment: parsed.sentiment as SentimentLabel,
      score: typeof parsed.score === 'number' ? Math.max(-1, Math.min(1, parsed.score)) : 0,
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
      keyReasons: Array.isArray(parsed.keyReasons) ? (parsed.keyReasons as string[]) : [],
    }
  } catch (e) {
    console.error('[analyzeSentiment] JSON parse error:', e, '\nraw:', rawText)
    return { sentiment: 'neutral', score: 0, summary: '감성 분석 결과 파싱에 실패했습니다.', keyReasons: [] }
  }
}
