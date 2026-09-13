import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

const googleId = process.env.GOOGLE_CLIENT_ID;
const googleSecret = process.env.GOOGLE_CLIENT_SECRET;

export const authOptions: NextAuthOptions = {
  providers:
    googleId && googleSecret
      ? [GoogleProvider({ clientId: googleId, clientSecret: googleSecret })]
      : [],
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt' },
};
