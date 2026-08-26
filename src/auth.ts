import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { loginInputSchema } from "@/server/validation/auth";
import { prisma } from "@/server/prisma";
import { verifyPassword } from "@/server/auth/password";
import { clientIpFromHeaders, consumeRateLimit } from "@/server/auth/rateLimit";
import { logInfo, logWarn } from "@/server/log";
import { isHttpsOrigin } from "@/lib/appUrl";

const LOGIN_ERROR = "ელ. ფოსტა ან პაროლი არასწორია";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  useSecureCookies: isHttpsOrigin(),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const parsed = loginInputSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const email = parsed.data.email;
        const ip = clientIpFromHeaders(request?.headers);
        const [emailAllowed, ipAllowed] = await Promise.all([
          consumeRateLimit(`login:email:${email}`, 10, 15 * 60 * 1000),
          consumeRateLimit(`login:ip:${ip}`, 30, 15 * 60 * 1000),
        ]);
        if (!emailAllowed || !ipAllowed) {
          logWarn("auth.login_rate_limited", { email, ip });
          return null;
        }

        const customer = await prisma.customer.findUnique({ where: { email } });
        if (!customer) {
          logInfo("auth.login_failed", { email, ip });
          return null;
        }

        const matches = await verifyPassword(parsed.data.password, customer.passwordHash);
        if (!matches) {
          logInfo("auth.login_failed", { email, ip });
          return null;
        }

        return {
          id: customer.id,
          email: customer.email,
          firstName: customer.firstName,
          lastName: customer.lastName,
          phone: customer.phone ?? "",
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.email = user.email ?? "";
        token.phone = user.phone ?? "";
      }
      if (trigger === "update" && session) {
        const next = session as { firstName?: string; lastName?: string; phone?: string };
        if (typeof next.firstName === "string") token.firstName = next.firstName;
        if (typeof next.lastName === "string") token.lastName = next.lastName;
        if (typeof next.phone === "string") token.phone = next.phone;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = String(token.id ?? "");
      session.user.firstName = String(token.firstName ?? "");
      session.user.lastName = String(token.lastName ?? "");
      session.user.email = String(token.email ?? "");
      session.user.phone = String(token.phone ?? "");
      return session;
    },
  },
});

export { LOGIN_ERROR };
