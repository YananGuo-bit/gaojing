import { NextResponse } from 'next/server';
import { ensureSchema } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const sql = await ensureSchema();
    if (!sql) {
      return NextResponse.json({ available: false, count: 0 });
    }
    const rows = await sql`
      SELECT
        COUNT(*)::int AS count,
        AVG(score_logic)::float AS avg_logic,
        AVG(score_evidence)::float AS avg_evidence,
        AVG(score_language)::float AS avg_language
      FROM submissions
    `;
    const row = rows[0] as
      | { count?: number; avg_logic?: number; avg_evidence?: number; avg_language?: number }
      | undefined;
    return NextResponse.json({
      available: true,
      count: row?.count ?? 0,
      avg_logic: row?.avg_logic ?? null,
      avg_evidence: row?.avg_evidence ?? null,
      avg_language: row?.avg_language ?? null,
    });
  } catch (e) {
    console.error('stats query failed', e);
    return NextResponse.json({ available: false, count: 0 });
  }
}
