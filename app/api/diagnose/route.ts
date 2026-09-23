import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ensureSchema } from '@/lib/db';
import { getSection, type SectionConfig } from '@/lib/rubric';

export const runtime = 'nodejs';

function buildResponseSchema(section: SectionConfig) {
  const scoreProps: Record<string, unknown> = {};
  section.dimensions.forEach((d) => {
    scoreProps[d.key] = {
      type: 'OBJECT',
      properties: { score: { type: 'INTEGER' }, comment: { type: 'STRING' } },
      required: ['score', 'comment'],
    };
  });
  return {
    type: 'OBJECT',
    properties: {
      tier_verdict: { type: 'STRING' },
      scores: {
        type: 'OBJECT',
        properties: scoreProps,
        required: section.dimensions.map((d) => d.key),
      },
      comments: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            quote: { type: 'STRING' },
            issue: { type: 'STRING' },
            top_journal_practice: { type: 'STRING' },
          },
          required: ['quote', 'issue', 'top_journal_practice'],
        },
      },
      rewrite: { type: 'STRING' },
    },
    required: ['tier_verdict', 'scores', 'comments', 'rewrite'],
  };
}

function buildPrompt(discipline: string, targetJournal: string, section: SectionConfig, text: string) {
  const dimensionList = section.dimensions.map((d) => `  - ${d.key}: ${d.label}`).join('\n');
  const journalLine = targetJournal
    ? `诊断对标期刊：${targetJournal}（请结合该期刊的真实写作与评审惯例判断差距）。`
    : '诊断对标期刊：未指定，请按该学科高水平期刊的通行写作标准判断。';
  return `你是一名审稿经验丰富的地球科学领域科研写作导师，擅长指出学生稿件与高水平期刊写作范式之间的具体差距。

学科方向：${discipline}；${journalLine}

${section.genreInstruction}

学生文本：
"""
${text.slice(0, 3000)}
"""

请给出诊断结果，字段要求：
- tier_verdict：一句话判断这段文字与目标期刊的差距处于什么水平、核心原因是什么，40-70字。
- scores：以下每个维度给 0-100 的整数分和 20-40 字评语：
${dimensionList}
- comments：3到5条，每条包含从原文逐字摘录的一小段（不超过20字）、具体问题（15-25字）、目标期刊在同样位置通常怎么处理（给出具体可操作的做法，30-60字）。
- rewrite：将学生原文改写为更接近目标期刊写作风格的示范版本，仅用于对照学习，长度不超过原文的1.3倍，保留原文的核心研究内容，不得虚构新数据。`;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'server_not_configured', message: '服务端尚未配置 GEMINI_API_KEY' },
      { status: 500 },
    );
  }

  const authEnabled = Boolean(
    process.env.BNU_SSO_CLIENT_ID &&
      process.env.BNU_SSO_CLIENT_SECRET &&
      process.env.BNU_SSO_AUTHORIZATION_URL &&
      process.env.BNU_SSO_TOKEN_URL &&
      process.env.BNU_SSO_USERINFO_URL,
  );
  let userEmail: string | null = null;
  if (authEnabled) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'not_authenticated', message: '请先使用 Google 登录' }, { status: 401 });
    }
    userEmail = session.user.email;
  }

  let body: { discipline?: string; tier?: string; section?: string; text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_request', message: '请求体不是合法 JSON' }, { status: 400 });
  }

  const { discipline, tier, text } = body ?? {};
  const section = getSection(String(body?.section || 'introduction'));
  if (typeof text !== 'string' || text.trim().length < 20) {
    return NextResponse.json(
      { error: 'invalid_request', message: '文本过短，至少需要 20 个字符' },
      { status: 400 },
    );
  }

  const prompt = buildPrompt(String(discipline || '地理科学'), String(tier || ''), section, text);

  const model = 'gemini-3.6-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  let geminiRes: Response;
  try {
    geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: buildResponseSchema(section),
          temperature: 0.4,
        },
      }),
    });
  } catch {
    return NextResponse.json(
      { error: 'upstream_unreachable', message: '无法连接到模型服务，请稍后重试' },
      { status: 502 },
    );
  }

  if (!geminiRes.ok) {
    const errText = await geminiRes.text().catch(() => '');
    const status = geminiRes.status === 429 ? 429 : 502;
    return NextResponse.json(
      { error: status === 429 ? 'rate_limited' : 'upstream_error', message: errText.slice(0, 300) },
      { status },
    );
  }

  const payload: {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  } = await geminiRes.json();
  const rawText = payload?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';

  let data: {
    tier_verdict?: string;
    scores?: Record<string, { score?: number }>;
    rewrite?: string;
  };
  try {
    data = JSON.parse(rawText);
  } catch {
    return NextResponse.json(
      { error: 'invalid_json', message: 'AI 返回内容无法解析，请重试' },
      { status: 502 },
    );
  }

  try {
    const sql = await ensureSchema();
    if (sql) {
      const firstDimKey = section.dimensions[0]?.key;
      const overallScore = firstDimKey ? data.scores?.[firstDimKey]?.score ?? null : null;
      await sql`
        INSERT INTO submissions
          (discipline, tier, section, manuscript, tier_verdict, score_logic, rewrite, user_email)
        VALUES
          (${discipline}, ${tier}, ${section.label}, ${text.slice(0, 5000)}, ${data.tier_verdict ?? null},
           ${overallScore}, ${data.rewrite ?? null}, ${userEmail})
      `;
    }
  } catch (e) {
    console.error('persist submission failed', e);
  }

  return NextResponse.json(data);
}
