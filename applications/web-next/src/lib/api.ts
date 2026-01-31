import { createClient } from "@lab/client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export const api = createClient({ baseUrl: API_BASE });
