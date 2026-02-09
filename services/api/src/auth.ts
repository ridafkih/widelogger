import { db } from "@lab/database/client";
import {
  account,
  session,
  user,
  verification,
} from "@lab/database/schema/auth";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

interface AuthConfig {
  secret: string;
  baseURL: string;
  githubClientId: string;
  githubClientSecret: string;
  trustedOrigins: string[];
}

export function createAuth(config: AuthConfig) {
  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user,
        session,
        account,
        verification,
      },
    }),
    basePath: "/api/auth",
    secret: config.secret,
    baseURL: config.baseURL,
    socialProviders: {
      github: {
        clientId: config.githubClientId,
        clientSecret: config.githubClientSecret,
      },
    },
    trustedOrigins: config.trustedOrigins,
  });
}

export type Auth = ReturnType<typeof createAuth>;
