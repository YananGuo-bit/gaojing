import type { NextAuthOptions, Profile } from 'next-auth';

const clientId = process.env.BNU_SSO_CLIENT_ID;
const clientSecret = process.env.BNU_SSO_CLIENT_SECRET;
const authorizationUrl = process.env.BNU_SSO_AUTHORIZATION_URL;
const tokenUrl = process.env.BNU_SSO_TOKEN_URL;
const userinfoUrl = process.env.BNU_SSO_USERINFO_URL;

const bnuConfigured = Boolean(clientId && clientSecret && authorizationUrl && tokenUrl && userinfoUrl);

// 北京师范大学统一身份认证登录。具体接口地址、字段名需要以信息化办提供的
// 接入文档为准；下面的 profile() 按常见 OAuth2/OIDC 字段名做了尽量宽松的兜底，
// 拿到真实文档后可能需要调整字段名（比如 userid 可能叫 uid / netid 等）。
const bnuProvider = bnuConfigured
  ? {
      id: 'bnu-sso',
      name: '北京师范大学统一身份认证',
      type: 'oauth' as const,
      authorization: { url: authorizationUrl, params: { scope: 'openid profile' } },
      token: tokenUrl,
      userinfo: userinfoUrl,
      clientId,
      clientSecret,
      checks: ['state' as const],
      profile(profile: Profile & Record<string, unknown>) {
        return {
          id: String(profile.sub ?? profile.userid ?? profile.id ?? profile.uid ?? ''),
          name: String(profile.name ?? profile.username ?? profile.realname ?? ''),
          email: String(profile.email ?? ''),
        };
      },
    }
  : null;

export const authOptions: NextAuthOptions = {
  providers: bnuProvider ? [bnuProvider] : [],
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt' },
};
