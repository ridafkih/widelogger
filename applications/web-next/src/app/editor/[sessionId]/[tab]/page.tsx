"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { tv } from "tailwind-variants";
import { Chat } from "@/components/chat";
import { StatusIcon } from "@/components/status-icon";
import { ChatTabContent } from "@/components/chat-tab-content";
import { ReviewTabContent } from "@/components/review-tab-content";
import { FrameTabContent } from "@/components/frame-tab-content";
import { StreamTabContent } from "@/components/stream-tab-content";
import { SessionInfoView } from "@/components/session-info-view";
import { PageFrame, Header, PageContent } from "@/components/layout-primitives";
import { useAgent } from "@/lib/use-agent";
import { useDeleteSession } from "@/lib/hooks";
import { useSessionContext } from "../layout";

type TabValue = "chat" | "review" | "frame" | "stream";

const tabStyles = tv({
  base: "px-3 py-1 text-xs",
  variants: {
    active: {
      true: "text-text border-b-2 border-text -mb-px",
      false: "text-text-muted hover:text-text",
    },
  },
});

function SessionHeader() {
  const { session, project } = useSessionContext();

  return (
    <Header>
      <StatusIcon status={session?.status ?? "idle"} />
      <div className="flex items-center gap-1">
        <span className="text-text-muted text-nowrap overflow-x-hidden truncate">
          {project?.name}
        </span>
        <span className="text-text-muted">/</span>
        {session?.title ? (
          <span className="text-text font-medium text-nowrap overflow-x-hidden truncate">
            {session.title}
          </span>
        ) : (
          <span className="text-text-muted italic text-nowrap overflow-x-hidden truncate">
            Unnamed Session
          </span>
        )}
      </div>
    </Header>
  );
}

function SessionTabs({ currentTab }: { currentTab: TabValue }) {
  const { sessionId } = useSessionContext();

  const tabs: { value: TabValue; label: string }[] = [
    { value: "chat", label: "Chat" },
    { value: "review", label: "Review" },
    { value: "frame", label: "Frame" },
    { value: "stream", label: "Stream" },
  ];

  return (
    <div className="flex border-b border-border">
      {tabs.map((tab) => (
        <Link
          key={tab.value}
          href={`/editor/${sessionId}/${tab.value}`}
          className={tabStyles({ active: currentTab === tab.value })}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}

function TabContent({ tab }: { tab: TabValue }) {
  const { sessionId, containerUrls } = useSessionContext();
  const { messages, sendMessage } = useAgent(sessionId);

  switch (tab) {
    case "chat":
      return (
        <Chat.Provider key={sessionId} onSubmit={sendMessage}>
          <ChatTabContent messages={messages} />
        </Chat.Provider>
      );
    case "review":
      return <ReviewTabContent sessionId={sessionId} />;
    case "frame":
      return <FrameTabContent frameUrl={containerUrls[0]} />;
    case "stream":
      return <StreamTabContent />;
    default:
      return null;
  }
}

function SessionInfoPanel() {
  const router = useRouter();
  const { session, project, containers } = useSessionContext();
  const deleteSession = useDeleteSession();

  const handleDelete = () => {
    if (!session) return;
    deleteSession(session, () => router.push("/editor"));
  };

  if (!session || !project) {
    return null;
  }

  return (
    <div className="min-w-64 shrink-0">
      <SessionInfoView
        session={session}
        project={project}
        containers={containers}
        onDelete={handleDelete}
      />
    </div>
  );
}

type TabPageProps = {
  params: Promise<{ sessionId: string; tab: string }>;
};

export default function TabPage({ params }: TabPageProps) {
  const { tab } = use(params);
  const validTabs: TabValue[] = ["chat", "review", "frame", "stream"];
  const currentTab = validTabs.includes(tab as TabValue) ? (tab as TabValue) : "chat";

  return (
    <div className="flex h-full">
      <div className="flex-1 min-w-0 border-r border-border">
        <PageFrame position="relative">
          <SessionHeader />
          <SessionTabs currentTab={currentTab} />
          <PageContent display="flex">
            <TabContent tab={currentTab} />
          </PageContent>
        </PageFrame>
      </div>
      <SessionInfoPanel />
    </div>
  );
}
