import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ensureSchema } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
  }
  try {
    const sql = await ensureSchema();
    if (!sql) return NextResponse.json({ items: [] });
    const rows = await sql`
      SELECT id, created_at, discipline, tier, section, tier_verdict, score_logic
      FROM submissions
      WHERE user_email = ${email}
      ORDER BY created_at DESC
      LIMIT 20
    `;
    return NextResponse.json({ items: rows });
  } catch (e) {
    console.error('history query failed', e);
    return NextResponse.json({ items: [] });
  }
}
