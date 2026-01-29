import { z } from "zod";
import type { RouteHandler } from "../../../../utils/route-handler";
import { agentManager } from "../../../../agent";

const MessageBodySchema = z.object({
  message: z.string().min(1),
});

const POST: RouteHandler = async (request, params) => {
  const { sessionId } = params;

  const session = agentManager.getSession(sessionId);
  if (!session) {
    return Response.json({ error: "Agent not started for this session" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = MessageBodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 });
  }

  if (session.isActive) {
    return Response.json({ error: "Agent is currently processing a message" }, { status: 409 });
  }

  session.sendMessage(parsed.data.message).catch((error) => {
    console.error(`Error processing message for session ${sessionId}:`, error);
  });

  return Response.json({ accepted: true }, { status: 202 });
};

export { POST };
