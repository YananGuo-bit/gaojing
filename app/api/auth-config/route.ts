import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  const enabled = Boolean(
    process.env.BNU_SSO_CLIENT_ID &&
      process.env.BNU_SSO_CLIENT_SECRET &&
      process.env.BNU_SSO_AUTHORIZATION_URL &&
      process.env.BNU_SSO_TOKEN_URL &&
      process.env.BNU_SSO_USERINFO_URL,
  );
  return NextResponse.json({ enabled });
}
