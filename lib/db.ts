import { neon } from '@neondatabase/serverless';

// Vercel's Neon integration sets DATABASE_URL automatically once you
// add "Neon" storage to the project in the Vercel dashboard.
export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return neon(url);
}

let ensured = false;

export async function ensureSchema() {
  const sql = getSql();
  if (!sql || ensured) return sql;
  await sql`
    CREATE TABLE IF NOT EXISTS submissions (
      id BIGSERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      discipline TEXT NOT NULL,
      tier TEXT NOT NULL,
      section TEXT NOT NULL,
      manuscript TEXT NOT NULL,
      tier_verdict TEXT,
      score_logic INT,
      score_evidence INT,
      score_language INT,
      rewrite TEXT
    )
  `;
  ensured = true;
  return sql;
}
