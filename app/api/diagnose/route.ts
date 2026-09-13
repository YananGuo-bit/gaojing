import { NextRequest, NextResponse } from 'next/server';
import { ensureSchema } from '@/lib/db';

export const runtime = 'nodejs';

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    tier_verdict: { type: 'STRING' },
    scores: {
      type: 'OBJECT',
      properties: {
        logic: {
          type: 'OBJECT',
          properties: { score: { type: 'INTEGER' }, comment: { type: 'STRING' } },
          required: ['score', 'comment'],
        },
        evidence: {
          type: 'OBJECT',
          properties: { score: { type: 'INTEGER' }, comment: { type: 'STRING' } },
          required: ['score', 'comment'],
        },
        language: {
          type: 'OBJECT',
          properties: { score: { type: 'INTEGER' }, comment: { type: 'STRING' } },
          required: ['score', 'comment'],
        },
      },
      required: ['logic', 'evidence', 'language'],
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

function buildPrompt(discipline: string, tier: string, section: string, text: string) {
  return `你是一名长期在 Nature 系列子刊担任编委、审稿经验丰富的地球科学领域科研写作导师，擅长指出学生稿件与顶刊/子刊写作范式之间的具体差距。

请对下面这段学生撰写的论文文本进行诊断。学科方向：${discipline}；文段类型：${section}；诊断对标层级：${tier}。

学生文本：
"""
${text.slice(0, 3000)}
"""

请给出诊断结果，字段要求：
- tier_verdict：一句话判断这段文字目前更接近哪个层级、核心原因是什么，40-70字。
- scores.logic / evidence / language：每项给 0-100 的整数分和 20-40 字评语，分别对应逻辑紧凑度、证据充分性、语言地道程度。
- comments：3到5条，每条包含从原文逐字摘录的一小段（不超过20字）、具体问题（15-25字）、对标层级期刊在同样位置通常怎么写（给出具体可操作的做法，30-60字）。
- rewrite：将学生原文改写为更接近目标层级写作风格的示范版本，仅用于对照学习，长度不超过原文的1.3倍，保留原文的核心研究内容，不得虚构新数据。`;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'server_not_configured', message: '服务端尚未配置 GEMINI_API_KEY' },
      { status: 500 },
    );
  }

  let body: { discipline?: string; tier?: string; section?: string; text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_request', message: '请求体不是合法 JSON' }, { status: 400 });
  }

  const { discipline, tier, section, text } = body ?? {};
  if (typeof text !== 'string' || text.trim().length < 20) {
    return NextResponse.json(
      { error: 'invalid_request', message: '文本过短，至少需要 20 个字符' },
      { status: 400 },
    );
  }

  const prompt = buildPrompt(
    String(discipline || '地理科学'),
    String(tier || '领域子刊'),
    String(section || '引言'),
    text,
  );

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
          responseSchema: RESPONSE_SCHEMA,
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
    scores?: { logic?: { score?: number }; evidence?: { score?: number }; language?: { score?: number } };
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

  // Best-effort persistence; never fail the request if the DB isn't provisioned yet.
  try {
    const sql = await ensureSchema();
    if (sql) {
      await sql`
        INSERT INTO submissions
          (discipline, tier, section, manuscript, tier_verdict, score_logic, score_evidence, score_language, rewrite)
        VALUES
          (${discipline}, ${tier}, ${section}, ${text.slice(0, 5000)}, ${data.tier_verdict ?? null},
           ${data.scores?.logic?.score ?? null}, ${data.scores?.evidence?.score ?? null}, ${data.scores?.language?.score ?? null},
           ${data.rewrite ?? null})
      `;
    }
  } catch (e) {
    console.error('persist submission failed', e);
  }

  return NextResponse.json(data);
}
