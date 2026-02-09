import "server-only";
import { createClient } from "@lab/client";
import { cookies } from "next/headers";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

if (!API_BASE) {
  throw new Error("Must set NEXT_PUBLIC_API_URL");
}

async function createServerClient() {
  const cookieStore = await cookies();
  const cookie = cookieStore.toString();
  return createClient({
    baseUrl: API_BASE,
    headers: cookie ? { Cookie: cookie } : undefined,
  });
}

export async function prefetchProjects() {
  const cookieStore = await cookies();
  const hasSession = cookieStore.has("better-auth.session_token");
  if (!hasSession) {
    return [];
  }

  const api = await createServerClient();
  return api.projects.list();
}
