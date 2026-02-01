import { createClient } from "@lab/client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

if (!API_BASE) {
  throw Error("Must set NEXT_PUBLIC_API_URL");
}

export const api = createClient({ baseUrl: API_BASE });

export async function fetchChannelSnapshot<T>(channel: string, sessionId: string): Promise<T> {
  const response = await fetch(`${API_BASE}/channels/${channel}/snapshot?session=${sessionId}`);
  if (!response.ok) throw new Error(`Failed to fetch ${channel} snapshot`);
  const { data } = await response.json();
  return data as T;
}
