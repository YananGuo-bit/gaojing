import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  const enabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  return NextResponse.json({ enabled });
}
