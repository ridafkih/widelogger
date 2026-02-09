import { createAuthClient } from "better-auth/react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

if (!API_BASE) {
  throw new Error("Must set NEXT_PUBLIC_API_URL");
}

export const authClient = createAuthClient({
  baseURL: API_BASE,
});

export const { useSession, signIn, signOut } = authClient;
