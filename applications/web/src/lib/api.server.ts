import "server-only";
import { createClient } from "@lab/client";
import { cookies } from "next/headers";

function getApiBase(): string {
  const value = process.env.NEXT_PUBLIC_API_URL;
  if (!value) {
    throw new Error("Must set NEXT_PUBLIC_API_URL");
  }
  return value;
}

async function createServerClient() {
  const cookieStore = await cookies();
  const cookie = cookieStore.toString();
  return createClient({
    baseUrl: getApiBase(),
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
