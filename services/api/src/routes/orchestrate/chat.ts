import { z } from "zod";
import type { RouteHandler } from "../../utils/handlers/route-handler";
import { chatOrchestrate } from "../../utils/orchestration/chat-orchestrator";

const chatRequestSchema = z.object({
  content: z.string().min(1),
  conversationHistory: z.array(z.string()).optional(),
  platformOrigin: z.string().optional(),
  platformChatId: z.string().optional(),
  modelId: z.string().optional(),
  timestamp: z.string().datetime().optional(),
});

const POST: RouteHandler = async (request, _params, context) => {
  const rawBody = await request.json().catch(() => null);
  const parseResult = chatRequestSchema.safeParse(rawBody);

  if (!parseResult.success) {
    return Response.json(
      {
        error:
          "Invalid request body. Required: { content: string, conversationHistory?: string[], platformOrigin?: string, platformChatId?: string, modelId?: string }",
      },
      { status: 400 },
    );
  }

  const body = parseResult.data;

  try {
    const result = await chatOrchestrate({
      content: body.content.trim(),
      conversationHistory: body.conversationHistory,
      platformOrigin: body.platformOrigin,
      platformChatId: body.platformChatId,
      browserService: context.browserService,
      modelId: body.modelId,
      timestamp: body.timestamp,
    });

    return Response.json(result, { status: 200 });
  } catch (error) {
    console.error("[ChatOrchestrate] Error:", error);
    const message = error instanceof Error ? error.message : "Chat orchestration failed";
    return Response.json({ error: message }, { status: 500 });
  }
};

export { POST };
