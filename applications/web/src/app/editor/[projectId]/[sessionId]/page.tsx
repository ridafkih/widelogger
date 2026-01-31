"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { SessionView } from "@/components/session-view";
import { SessionSidebar } from "@/components/session-sidebar";
import type { ReviewableFile } from "@/types/review";
import { useMultiplayer } from "@/lib/multiplayer/client";
import { useAgent, useModels } from "@/lib/api";
import type { Model } from "@lab/client";

export default function SessionPage() {
  const params = useParams();
  const sessionId = typeof params.sessionId !== "string" ? "" : params.sessionId;

  const { connectionState, useChannel } = useMultiplayer();
  const { sendMessage, isSending, state, messages, activePermission, respondToPermission } =
    useAgent(sessionId);
  const isProcessing = state.status === "active" && state.isProcessing;

  const { models } = useModels();
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);

  const changedFiles = useChannel("sessionChangedFiles", { uuid: sessionId });
  const branches = useChannel("sessionBranches", { uuid: sessionId });
  const links = useChannel("sessionLinks", { uuid: sessionId });
  const logSources = useChannel("sessionLogs", { uuid: sessionId });
  const sessionContainers = useChannel("sessionContainers", { uuid: sessionId });
  const browserStream = useChannel("sessionBrowserState", { uuid: sessionId });

  const [localReviewFiles, setLocalReviewFiles] = useState<ReviewableFile[]>([]);
  const reviewFiles = changedFiles.length > 0 ? changedFiles : localReviewFiles;

  // Track if we've already processed the initial message
  const initialMessageSentRef = useRef(false);

  // Check for initial message from orchestration page
  useEffect(() => {
    if (state.status !== "active" || initialMessageSentRef.current || isSending) return;

    const key = `initial-message-${sessionId}`;
    const initialMessage = sessionStorage.getItem(key);
    if (initialMessage) {
      sessionStorage.removeItem(key);
      initialMessageSentRef.current = true;
      sendMessage(initialMessage);
    }
  }, [sessionId, state.status, isSending, sendMessage]);

  const handleSendMessage = async (
    content: string,
    model?: { providerId: string; modelId: string },
  ) => {
    await sendMessage(content, model);
  };

  const handleDismissFile = (path: string) => {
    setLocalReviewFiles((files) =>
      files.map((file) => (file.path === path ? { ...file, status: "dismissed" as const } : file)),
    );
  };

  if (connectionState.status === "connecting" || connectionState.status === "reconnecting") {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Connecting...
      </div>
    );
  }

  return (
    <div className="flex h-full min-w-0">
      <SessionView
        messages={messages}
        reviewFiles={reviewFiles}
        onDismissFile={handleDismissFile}
        onSendMessage={handleSendMessage}
        isSending={isSending}
        isProcessing={isProcessing}
        models={models}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        activePermission={activePermission}
        onRespondToPermission={respondToPermission}
        links={links}
        containers={sessionContainers.map(({ id, name, status, urls }) => ({
          id,
          name,
          status,
          urls,
        }))}
        labSessionId={sessionId}
        browserStreamState={browserStream}
      />
      <SessionSidebar
        sessionId={sessionId}
        browserStreamState={browserStream}
        branches={branches}
        tasks={[]}
        links={links}
        containers={sessionContainers.map(({ id, name, status, urls }) => ({
          id,
          name,
          status,
          urls,
        }))}
        logSources={logSources.map((source) => ({
          id: source.id,
          name: source.name,
          logs: [],
        }))}
        reviewFiles={reviewFiles}
        onDismissFile={handleDismissFile}
      />
    </div>
  );
}
