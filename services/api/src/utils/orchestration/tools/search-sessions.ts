import { z } from "zod";
import { tool } from "ai";
import { db } from "@lab/database/client";
import { sessions } from "@lab/database/schema/sessions";
import { projects } from "@lab/database/schema/projects";
import { eq, ne, and, desc, or, ilike } from "drizzle-orm";
import { opencode } from "../../../clients/opencode";
import { resolveWorkspacePathBySession } from "../../workspace/resolve-path";

interface MessagePart {
  type: string;
  text?: string;
}

interface OpencodeMessage {
  info: { role: "user" | "assistant" };
  parts: MessagePart[];
}

function isMessagePart(value: unknown): value is MessagePart {
  return (
    typeof value === "object" && value !== null && "type" in value && typeof value.type === "string"
  );
}

function isOpencodeMessage(value: unknown): value is OpencodeMessage {
  if (typeof value !== "object" || value === null) return false;
  if (!("info" in value) || !("parts" in value)) return false;

  const info = value.info;
  if (typeof info !== "object" || info === null) return false;
  if (!("role" in info)) return false;
  if (info.role !== "user" && info.role !== "assistant") return false;

  const parts = value.parts;
  if (!Array.isArray(parts)) return false;

  return parts.every(isMessagePart);
}

function extractTextFromParts(parts: MessagePart[]): string {
  return parts
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .filter((text): text is string => text !== undefined)
    .join("\n");
}

const inputSchema = z.object({
  query: z.string().describe("The search query to find relevant sessions"),
  limit: z.number().optional().default(5).describe("Maximum number of results to return"),
});

export const searchSessionsTool = tool({
  description:
    "Searches across session titles and conversation content to find relevant sessions. Returns matching sessions with relevant content snippets.",
  inputSchema,
  execute: async ({ query, limit }) => {
    const searchLimit = limit ?? 5;

    const rows = await db
      .select({
        id: sessions.id,
        projectId: sessions.projectId,
        projectName: projects.name,
        title: sessions.title,
        opencodeSessionId: sessions.opencodeSessionId,
        status: sessions.status,
        createdAt: sessions.createdAt,
      })
      .from(sessions)
      .innerJoin(projects, eq(sessions.projectId, projects.id))
      .where(
        and(
          ne(sessions.status, "deleting"),
          ne(sessions.status, "pooled"),
          or(ilike(sessions.title, `%${query}%`), ilike(projects.name, `%${query}%`)),
        ),
      )
      .orderBy(desc(sessions.createdAt))
      .limit(searchLimit * 2);

    const results: Array<{
      sessionId: string;
      projectName: string;
      title: string | null;
      relevantContent: string;
      score: number;
    }> = [];

    for (const row of rows) {
      if (results.length >= searchLimit) break;

      let relevantContent = "";
      let score = 0;

      if (row.title?.toLowerCase().includes(query.toLowerCase())) {
        relevantContent = row.title;
        score = 0.8;
      }

      if (row.projectName.toLowerCase().includes(query.toLowerCase())) {
        score = Math.max(score, 0.6);
      }

      if (row.opencodeSessionId) {
        try {
          const directory = await resolveWorkspacePathBySession(row.id);
          const response = await opencode.session.messages({
            sessionID: row.opencodeSessionId,
            directory,
          });

          const rawMessages = response.data ?? [];
          const messages = Array.isArray(rawMessages) ? rawMessages.filter(isOpencodeMessage) : [];
          const queryLower = query.toLowerCase();

          for (const msg of messages) {
            const text = extractTextFromParts(msg.parts);
            if (text.toLowerCase().includes(queryLower)) {
              const index = text.toLowerCase().indexOf(queryLower);
              const start = Math.max(0, index - 50);
              const end = Math.min(text.length, index + query.length + 50);
              relevantContent = "..." + text.slice(start, end) + "...";
              score = 1.0;
              break;
            }
          }
        } catch {
          // Continue without message search if it fails
        }
      }

      if (score > 0) {
        results.push({
          sessionId: row.id,
          projectName: row.projectName,
          title: row.title,
          relevantContent,
          score,
        });
      }
    }

    results.sort((a, b) => b.score - a.score);

    return { results: results.slice(0, searchLimit) };
  },
});
