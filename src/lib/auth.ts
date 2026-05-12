import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  debug: true,
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      checks: ["state"],
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/auth-error",
  },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
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
