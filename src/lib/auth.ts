import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  debug: true,
  trustHost: true,
  // Temporarily removed PrismaAdapter to isolate OAuth vs DB issue
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/auth-error",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  logger: {
    error(code, ...message) {
      console.error("[auth][error]", code, JSON.stringify(message, null, 2));
    },
    warn(code) {
      console.warn("[auth][warn]", code);
    },
    debug(code, ...message) {
      console.log("[auth][debug]", code, JSON.stringify(message, null, 2));
    },
  },
});
