import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe slice of the NextAuth config: no DB imports, no Node-only modules.
 * Imported by both `proxy.ts` (edge runtime) and `auth.ts` (server runtime).
 * `auth.ts` then layers the Credentials provider on top with the real DB lookup.
 */
export const authConfig = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 }, // 30 days
  pages: { signIn: "/auth/login" },
  providers: [], // populated in auth.ts
  callbacks: {
    authorized: ({ auth, request: { nextUrl } }) => {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;
      const isApiAuth = pathname.startsWith("/api/auth");
      const isAuthPage = pathname.startsWith("/auth");

      if (isApiAuth) return true;

      if (isAuthPage) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/dashboard", nextUrl));
        }
        return true;
      }

      if (!isLoggedIn) {
        const url = new URL("/auth/login", nextUrl);
        url.searchParams.set("returnTo", pathname + nextUrl.search);
        return Response.redirect(url);
      }

      return true;
    },
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (token.id) session.user.id = token.id as string;
      if (token.email) session.user.email = token.email as string;
      if (token.name) session.user.name = token.name as string;
      return session;
    },
  },
} satisfies NextAuthConfig;
