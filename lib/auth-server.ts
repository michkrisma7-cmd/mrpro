import "server-only";
import NextAuth, { CredentialsSignin } from "next-auth";
import { allowAuthAttempt } from "./auth-rate-limit";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { db } from "./db";
import { inspectAuthEnvironment } from "./auth-config";
import { verifyPassword } from "./password";
class RateLimited extends CredentialsSignin {
  code = "rate_limited";
}
export const authConfigured = inspectAuthEnvironment(process.env).configured;
export const credentialsSchema = z.object({
  email: z
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
});
export const { auth, handlers } = NextAuth({
  trustHost: true,
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        if (!authConfigured) return null;
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;
        if (!(await allowAuthAttempt(parsed.data.email, "login")))
          throw new RateLimited();
        const user = await db().appUser.findUnique({
          where: { email: parsed.data.email },
        });
        // Derive a key even for unknown accounts to avoid a fast account-existence signal.
        const valid = await verifyPassword(
          parsed.data.password,
          user?.passwordHash ??
            `scrypt:00000000000000000000000000000000:${"00".repeat(64)}`,
        );
        if (!user || !valid) return null;
        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
