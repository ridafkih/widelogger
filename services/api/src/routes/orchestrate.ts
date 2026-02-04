import { z } from "zod";
import type { RouteHandler } from "../utils/handlers/route-handler";
import { orchestrate } from "../utils/orchestration";

const orchestrationRequestSchema = z.object({
  content: z.string().min(1),
  channelId: z.string().optional(),
  modelId: z.string().optional(),
  platformOrigin: z.string().optional(),
  platformChatId: z.string().optional(),
  messagingMode: z.enum(["active", "passive"]).optional(),
});

const POST: RouteHandler = async (request, _params, context) => {
  const rawBody = await request.json().catch(() => null);
  const parseResult = orchestrationRequestSchema.safeParse(rawBody);

  if (!parseResult.success) {
    return Response.json(
      {
        error:
          "Invalid request body. Required: { content: string, channelId?: string, modelId?: string, platformOrigin?: string, platformChatId?: string, messagingMode?: 'active' | 'passive' }",
      },
      { status: 400 },
    );
  }

  const body = parseResult.data;

  try {
    const result = await orchestrate({
      content: body.content.trim(),
      channelId: body.channelId,
      modelId: body.modelId,
      platformOrigin: body.platformOrigin,
      platformChatId: body.platformChatId,
      messagingMode: body.messagingMode,
      browserService: context.browserService,
    });

    return Response.json(result, { status: 201 });
  } catch (error) {
    console.error("[Orchestrate] Error:", error);
    const message = error instanceof Error ? error.message : "Orchestration failed";
    return Response.json({ error: message }, { status: 500 });
  }
};

export { POST };
