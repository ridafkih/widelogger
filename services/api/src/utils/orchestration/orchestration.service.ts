import { db } from "@lab/database/client";
import {
  orchestrationRequests,
  type OrchestrationStatus,
  type MessagingMode,
} from "@lab/database/schema/orchestration-requests";
import { eq } from "drizzle-orm";
import { publisher } from "../../clients/publisher";
import { findAllProjects } from "../repositories/project.repository";
import { resolveProject, type ProjectResolutionResult } from "./project-resolver";
import { spawnSession } from "./session-spawner";
import { initiateConversation } from "./conversation-initiator";
import { sendMessageToSession } from "./message-sender";
import { findSessionById } from "../repositories/session.repository";
import type { BrowserService } from "../browser/browser-service";

export interface OrchestrationInput {
  content: string;
  channelId?: string;
  modelId?: string;
  platformOrigin?: string;
  platformChatId?: string;
  messagingMode?: MessagingMode;
  browserService: BrowserService;
}

export interface OrchestrationResult {
  orchestrationId: string;
  sessionId: string;
  projectId: string;
  projectName: string;
}

interface OrchestrationContext {
  id: string;
  content: string;
  modelId?: string;
  browserService: BrowserService;
}

async function createOrchestrationRecord(input: {
  content: string;
  channelId?: string;
  modelId?: string;
  platformOrigin?: string;
  platformChatId?: string;
  messagingMode?: MessagingMode;
}): Promise<string> {
  const [record] = await db
    .insert(orchestrationRequests)
    .values({
      content: input.content,
      channelId: input.channelId,
      modelId: input.modelId,
      platformOrigin: input.platformOrigin,
      platformChatId: input.platformChatId,
      messagingMode: input.messagingMode ?? "passive",
      status: "pending",
    })
    .returning({ id: orchestrationRequests.id });

  if (!record) throw new Error("Failed to create orchestration record");
  return record.id;
}

async function transitionTo(
  orchestrationId: string,
  status: OrchestrationStatus,
  data?: {
    resolvedProjectId?: string;
    resolvedSessionId?: string;
    resolutionConfidence?: string;
    resolutionReasoning?: string;
    projectName?: string | null;
    sessionId?: string | null;
    errorMessage?: string | null;
  },
): Promise<void> {
  await db
    .update(orchestrationRequests)
    .set({
      status,
      resolvedProjectId: data?.resolvedProjectId,
      resolvedSessionId: data?.resolvedSessionId,
      resolutionConfidence: data?.resolutionConfidence,
      resolutionReasoning: data?.resolutionReasoning,
      errorMessage: data?.errorMessage,
      updatedAt: new Date(),
    })
    .where(eq(orchestrationRequests.id, orchestrationId));

  publisher.publishDelta(
    "orchestrationStatus",
    { uuid: orchestrationId },
    {
      status,
      projectName: data?.projectName,
      sessionId: data?.sessionId,
      errorMessage: data?.errorMessage,
    },
  );
}

function initializeStatusChannel(orchestrationId: string): void {
  publisher.publishSnapshot(
    "orchestrationStatus",
    { uuid: orchestrationId },
    {
      status: "pending",
      projectName: null,
      sessionId: null,
      errorMessage: null,
    },
  );
}

async function resolveTargetProject(ctx: OrchestrationContext): Promise<ProjectResolutionResult> {
  await transitionTo(ctx.id, "thinking");

  const projects = await findAllProjects();
  if (projects.length === 0) {
    throw new Error("No projects available");
  }

  const resolution = await resolveProject(ctx.content, projects);

  await transitionTo(ctx.id, "delegating", {
    resolvedProjectId: resolution.projectId,
    resolutionConfidence: resolution.confidence,
    resolutionReasoning: resolution.reasoning,
    projectName: resolution.projectName,
  });

  return resolution;
}

async function spawnSessionForProject(
  ctx: OrchestrationContext,
  resolution: ProjectResolutionResult,
): Promise<string> {
  await transitionTo(ctx.id, "starting", { projectName: resolution.projectName });

  const { session } = await spawnSession({
    projectId: resolution.projectId,
    taskSummary: ctx.content,
    browserService: ctx.browserService,
  });

  return session.id;
}

async function startConversation(ctx: OrchestrationContext, sessionId: string): Promise<void> {
  await initiateConversation({
    sessionId,
    task: ctx.content,
    modelId: ctx.modelId,
  });
}

async function markComplete(
  ctx: OrchestrationContext,
  sessionId: string,
  projectName: string,
): Promise<void> {
  await transitionTo(ctx.id, "complete", {
    resolvedSessionId: sessionId,
    projectName,
    sessionId,
  });
}

async function markFailed(orchestrationId: string, error: unknown): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : "Unknown error";
  await transitionTo(orchestrationId, "error", { errorMessage });
}

export async function orchestrate(input: OrchestrationInput): Promise<OrchestrationResult> {
  // Check if this is a message to an existing session
  if (input.channelId) {
    const existingSession = await findSessionById(input.channelId);
    if (existingSession && existingSession.opencodeSessionId) {
      // Route to existing session
      await sendMessageToSession({
        sessionId: input.channelId,
        opencodeSessionId: existingSession.opencodeSessionId,
        content: input.content,
        modelId: input.modelId,
      });

      return {
        orchestrationId: "", // No new orchestration created for existing session messages
        sessionId: input.channelId,
        projectId: existingSession.projectId,
        projectName: existingSession.title ?? "Unknown",
      };
    }
  }

  // Create new orchestration for new sessions
  const orchestrationId = await createOrchestrationRecord({
    content: input.content,
    channelId: input.channelId,
    modelId: input.modelId,
    platformOrigin: input.platformOrigin,
    platformChatId: input.platformChatId,
    messagingMode: input.messagingMode,
  });

  initializeStatusChannel(orchestrationId);

  const ctx: OrchestrationContext = {
    id: orchestrationId,
    content: input.content,
    modelId: input.modelId,
    browserService: input.browserService,
  };

  try {
    const resolution = await resolveTargetProject(ctx);
    const sessionId = await spawnSessionForProject(ctx, resolution);
    await startConversation(ctx, sessionId);
    await markComplete(ctx, sessionId, resolution.projectName);

    return {
      orchestrationId,
      sessionId,
      projectId: resolution.projectId,
      projectName: resolution.projectName,
    };
  } catch (error) {
    await markFailed(orchestrationId, error);
    throw error;
  }
}
