import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getUserAiApiKey, ServerKeyLimitError } from '@/lib/get-user-ai-key';

const SYSTEM_INSTRUCTION =
  '당신은 개인 자산관리 전문 AI 어드바이저입니다.\n아래 포트폴리오 데이터를 분석하여 다음 4가지 항목으로 인사이트를 제공하세요.\n절대로 특정 종목의 매수/매도를 직접적으로 권유하지 마세요.\n모든 분석은 현재 데이터 기반이며, 투자 결정은 사용자 본인의 판단임을 명시하세요.\n\n[인사이트 구성]\n1. 포트폴리오 요약: 2~3문장\n2. 리스크 경고: 편중/위험 감지 시 구체적 경고 (없으면 \'안정적\')\n3. 리밸런싱 제안: 목표 비중 대비 조정 필요 항목\n4. 시장 상황 조언: 거시경제 흐름 기반 조언\n\n[출력 형식 — 반드시 아래 JSON으로만 응답]\n{\n  "summary": "전체를 한 문장으로 압축",\n  "details": {\n    "portfolioSummary": "...",\n    "riskWarning": "...",\n    "rebalanceSuggestion": "...",\n    "marketAdvice": "..."\n  }\n}';

const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 });
  }

  const insight = await prisma.insight.findFirst({
    where: { userId: session.user.id, isStale: false },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ insight: insight ?? null });
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 });
  }

  const userId = session.user.id;

  // 1. Check holdings exist
  const holdingsCount = await prisma.holding.count({ where: { userId } });
  if (holdingsCount === 0) {
    return NextResponse.json({ error: '자산을 먼저 입력해주세요' }, { status: 400 });
  }

  // 2. Check cooldown (5 minutes)
  const latestInsight = await prisma.insight.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  if (latestInsight) {
    const elapsed = Date.now() - new Date(latestInsight.createdAt).getTime();
    if (elapsed < COOLDOWN_MS) {
      return NextResponse.json(
        { error: '인사이트는 5분에 한 번만 생성할 수 있습니다.' },
        { status: 429 }
      );
    }
  }

  // 3. Fetch all holdings
  const holdings = await prisma.holding.findMany({
    where: { userId },
    select: { ticker: true, quantity: true },
  });

  // 4. Call Google Gemini API with fallback models
  const FALLBACK_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'];
  let aiApiKey: string;
  try {
    aiApiKey = await getUserAiApiKey(userId);
  } catch (e) {
    if (e instanceof ServerKeyLimitError) {
      return NextResponse.json(
        { error: e.message },
        { status: 429 }
      );
    }
    throw e;
  }
  const genAI = new GoogleGenerativeAI(aiApiKey);

  let rawText: string | undefined;
  let lastError: unknown;
  for (const modelName of FALLBACK_MODELS) {
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: SYSTEM_INSTRUCTION,
    });
    try {
      const result = await model.generateContent(JSON.stringify(holdings));
      rawText = result.response.text();
      if (modelName !== FALLBACK_MODELS[0]) {
        console.warn(`[POST /api/insights] Using fallback model: ${modelName}`);
      }
      break;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[POST /api/insights] Model ${modelName} failed: ${msg.split('\n')[0]}`);
      lastError = e;
    }
  }

  if (rawText === undefined) {
    console.error('[POST /api/insights] All Gemini models failed:', lastError);
    const copyablePrompt =
      SYSTEM_INSTRUCTION +
      '\n\n---\n\n현재 보유 자산:\n' +
      JSON.stringify(holdings, null, 2);
    return NextResponse.json(
      { error: 'AI 인사이트 생성에 실패했습니다', prompt: copyablePrompt },
      { status: 502 }
    );
  }

  // 5. Parse JSON — strip markdown code fences if present
  let parsed: { summary: string; details: Record<string, string> };
  try {
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    parsed = JSON.parse(cleaned);
  } catch (e) {
    console.error('[POST /api/insights] JSON parse error:', e, '\nraw:', rawText);
    return NextResponse.json({ error: 'AI 응답 파싱에 실패했습니다' }, { status: 502 });
  }

  // 6. Transaction: mark existing insights stale, create new one
  const newInsight = await prisma.$transaction(async (tx: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    await tx.insight.updateMany({
      where: { userId },
      data: { isStale: true },
    });

    return tx.insight.create({
      data: {
        userId,
        summary: parsed.summary,
        details: JSON.stringify(parsed.details),
      },
    });
  });

  return NextResponse.json({ insight: newInsight }, { status: 200 });
}
