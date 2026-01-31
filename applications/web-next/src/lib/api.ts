import { createClient } from "@lab/client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

if (!API_BASE) {
  throw Error("Must set NEXT_PUBLIC_API_URL");
}

export const api = createClient({ baseUrl: API_BASE });
