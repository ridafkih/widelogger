"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Box, ChevronRight, Plus, X, Maximize2 } from "lucide-react";
import { cn } from "@lab/ui/utils/cn";
import { PLACEHOLDER_PROJECTS, type Project, type Session } from "./placeholder-data";

type SelectedSession = Session & { project: Project };

function StatusIcon({ status }: { status: Session["status"] }) {
  if (status === "working") {
    return (
      <span className="inline-block size-3 border-[1.5px] border-yellow-500 border-t-transparent rounded-full animate-spin" />
    );
  }
  if (status === "completed") {
    return (
      <svg className="size-3 text-green-500" viewBox="0 0 12 12" fill="none">
        <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M3.5 6L5.5 8L8.5 4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg className="size-3 text-muted-foreground" viewBox="0 0 12 12" fill="none">
      <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
    </svg>
  );
}

function ChatPanel({
  session,
  onClose,
  onExpand,
}: {
  session: SelectedSession;
  onClose: () => void;
  onExpand: () => void;
}) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [input, setInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, [session.id]);

  useEffect(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
    }
  }, [input]);

  const handleSubmit = async () => {
    if (!input.trim() || isSubmitting) return;
    setIsSubmitting(true);
    console.log("Sending message:", input);
    await new Promise((r) => setTimeout(r, 500));
    setInput("");
    setIsSubmitting(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-8 flex items-center gap-2 px-4 border-b border-border shrink-0">
        <StatusIcon status={session.status} />
        <span className="text-xs text-muted-foreground">{session.project.name} /</span>
        <span className="text-xs font-medium truncate flex-1">{session.title}</span>
        <button onClick={onExpand} className="p-1 text-muted-foreground hover:text-foreground">
          <Maximize2 className="size-3" />
        </button>
        <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
          <X className="size-3" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {session.lastMessage ? (
          <div
            className={cn("flex gap-3", session.lastMessage.from === "user" && "flex-row-reverse")}
          >
            <div className="size-6 bg-muted text-[10px] font-medium flex items-center justify-center shrink-0">
              {session.lastMessage.from === "user" ? "You" : "AI"}
            </div>
            <div className="text-sm max-w-[80%]">{session.lastMessage.content}</div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground text-center py-8">No messages yet</div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="border border-border bg-background">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Send a message..."
            rows={3}
            className={cn(
              "w-full bg-transparent px-3 py-2 text-sm resize-none placeholder:text-muted-foreground focus:outline-none",
              isSubmitting && "opacity-50",
            )}
            disabled={isSubmitting}
          />
          <div className="flex items-center justify-between px-3 py-2 border-t border-border text-xs text-muted-foreground">
            <span>Enter to send</span>
            <span className={cn(input.trim() ? "text-foreground" : "")}>
              {isSubmitting ? "Sending..." : input.trim() ? "Ready" : ""}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [input, setInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projects] = useState<Project[]>(PLACEHOLDER_PROJECTS);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [view, setView] = useState<"projects" | "my-recent" | "team" | "settings">("projects");
  const [selectedSession, setSelectedSession] = useState<SelectedSession | null>(null);

  const allSessions = projects.flatMap((project) =>
    project.sessions.map((session) => ({ ...session, project })),
  );

  const toggleCollapsed = (projectId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  useEffect(() => {
    if (!selectedSession) {
      inputRef.current?.focus();
    }
  }, [selectedSession]);

  useEffect(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
    }
  }, [input]);

  const handleSubmit = async () => {
    if (!input.trim() || isSubmitting) return;
    setIsSubmitting(true);
    console.log("Sending to orchestrator:", input);
    await new Promise((r) => setTimeout(r, 500));
    setInput("");
    setIsSubmitting(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSelectSession = (session: Session, project: Project) => {
    setSelectedSession({ ...session, project });
  };

  const openFullEditor = (projectId: string, sessionId: string) => {
    router.push(`/editor/${projectId}/${sessionId}`);
  };

  return (
    <div className="h-screen bg-background text-foreground flex">
      {/* Left panel - Session list */}
      <div className="w-1/2 flex flex-col border-r border-border relative">
        {/* View tabs */}
        <div className="h-8 flex items-center gap-1 px-2 border-b border-border shrink-0">
          <button
            onClick={() => setView("projects")}
            className={cn(
              "px-2 py-1 text-xs font-medium",
              view === "projects"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Projects
          </button>
          <button
            onClick={() => setView("my-recent")}
            className={cn(
              "px-2 py-1 text-xs font-medium",
              view === "my-recent"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            My Recent
          </button>
          <button
            onClick={() => setView("team")}
            className={cn(
              "px-2 py-1 text-xs font-medium",
              view === "team" ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            Team
          </button>
          <button
            onClick={() => setView("settings")}
            className={cn(
              "px-2 py-1 text-xs font-medium",
              view === "settings"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Settings
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto pb-48">
          {view === "my-recent" &&
            allSessions.map((session) => (
              <div
                key={session.id}
                onClick={() => handleSelectSession(session, session.project)}
                onDoubleClick={() => openFullEditor(session.project.id, session.id)}
                className={cn(
                  "h-8 flex items-center gap-3 px-4 border-b border-border hover:bg-muted/30 cursor-pointer",
                  selectedSession?.id === session.id && "bg-muted/50",
                )}
              >
                <StatusIcon status={session.status} />
                <span className="text-xs text-muted-foreground shrink-0">
                  {session.project.name} / {session.id.slice(0, 6)}
                </span>
                <span className="text-xs truncate flex-1">{session.title}</span>
                {session.lastMessage && (
                  <span className="text-xs text-muted-foreground truncate max-w-[min(40ch,50%)]">
                    {session.lastMessage.content}
                  </span>
                )}
                <div className="size-5 bg-muted text-[9px] font-medium flex items-center justify-center shrink-0">
                  {session.lastMessage?.from === "user" ? "You" : "AI"}
                </div>
              </div>
            ))}

          {view === "projects" &&
            projects.map((project) => (
              <div key={project.id}>
                <div
                  onClick={() => toggleCollapsed(project.id)}
                  className="h-7 flex items-center gap-2 px-4 bg-muted border-b border-border sticky top-0 cursor-pointer"
                >
                  <ChevronRight
                    className={cn(
                      "size-3 text-muted-foreground transition-transform",
                      !collapsed.has(project.id) && "rotate-90",
                    )}
                  />
                  <Box className="size-3 text-muted-foreground" />
                  <span className="text-xs font-medium">{project.name}</span>
                  <span className="text-xs text-muted-foreground">{project.sessions.length}</span>
                  <div className="flex-1" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    className="p-0.5 text-muted-foreground hover:text-foreground"
                  >
                    <Plus className="size-3" />
                  </button>
                </div>
                {!collapsed.has(project.id) &&
                  project.sessions.map((session) => (
                    <div
                      key={session.id}
                      onClick={() => handleSelectSession(session, project)}
                      onDoubleClick={() => openFullEditor(project.id, session.id)}
                      className={cn(
                        "h-8 flex items-center gap-2 px-4 border-b border-border hover:bg-muted/30 cursor-pointer",
                        selectedSession?.id === session.id && "bg-muted/50",
                      )}
                    >
                      <StatusIcon status={session.status} />
                      <span className="text-xs text-muted-foreground w-14 shrink-0">
                        {session.id.slice(0, 6)}
                      </span>
                      <span className="text-xs truncate flex-1">{session.title}</span>
                      {session.lastMessage && (
                        <span className="text-xs text-muted-foreground truncate max-w-[min(40ch,50%)]">
                          {session.lastMessage.content}
                        </span>
                      )}
                      <div className="size-5 bg-muted text-[9px] font-medium flex items-center justify-center shrink-0">
                        {session.lastMessage?.from === "user" ? "You" : "AI"}
                      </div>
                    </div>
                  ))}
              </div>
            ))}

          {view === "team" && (
            <div className="p-4 space-y-4">
              <div className="space-y-1">
                <h2 className="text-sm font-medium">Team Members</h2>
                <p className="text-xs text-muted-foreground">
                  Manage who has access to this workspace
                </p>
              </div>
              <div className="space-y-1">
                {[
                  { name: "John Doe", email: "john@example.com", role: "Owner" },
                  { name: "Jane Smith", email: "jane@example.com", role: "Admin" },
                  { name: "Bob Wilson", email: "bob@example.com", role: "Member" },
                ].map((member) => (
                  <div
                    key={member.email}
                    className="h-10 flex items-center gap-3 px-3 border border-border"
                  >
                    <div className="size-6 bg-muted text-[10px] font-medium flex items-center justify-center shrink-0">
                      {member.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <span className="text-sm">{member.name}</span>
                    <div className="flex-1" />
                    <span className="text-xs text-muted-foreground">{member.email}</span>
                    <span className="text-xs text-muted-foreground">{member.role}</span>
                  </div>
                ))}
              </div>
              <button className="h-8 px-3 text-xs border border-border hover:bg-muted/50">
                Invite Member
              </button>
            </div>
          )}

          {view === "settings" && (
            <div className="p-4 space-y-6">
              <div className="space-y-3">
                <div className="space-y-1">
                  <h2 className="text-sm font-medium">Workspace</h2>
                  <p className="text-xs text-muted-foreground">General workspace settings</p>
                </div>
                <div className="space-y-2">
                  <label className="block">
                    <span className="text-xs text-muted-foreground">Workspace Name</span>
                    <input
                      type="text"
                      defaultValue="My Workspace"
                      className="mt-1 w-full h-8 px-2 text-sm bg-transparent border border-border focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <h2 className="text-sm font-medium">Git Integration</h2>
                  <p className="text-xs text-muted-foreground">Connect your repositories</p>
                </div>
                <div className="space-y-2">
                  <div className="h-10 flex items-center justify-between px-3 border border-border">
                    <span className="text-sm">GitHub</span>
                    <span className="text-xs text-green-500">Connected</span>
                  </div>
                  <div className="h-10 flex items-center justify-between px-3 border border-border">
                    <span className="text-sm">GitLab</span>
                    <button className="text-xs text-muted-foreground hover:text-foreground">
                      Connect
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <h2 className="text-sm font-medium">AI Providers</h2>
                  <p className="text-xs text-muted-foreground">Configure AI model providers</p>
                </div>
                <div className="space-y-2">
                  <div className="h-10 flex items-center justify-between px-3 border border-border">
                    <span className="text-sm">Anthropic</span>
                    <span className="text-xs text-green-500">Active</span>
                  </div>
                  <div className="h-10 flex items-center justify-between px-3 border border-border">
                    <span className="text-sm">OpenAI</span>
                    <button className="text-xs text-muted-foreground hover:text-foreground">
                      Add Key
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Floating input */}
        <div className="absolute bottom-0 left-0 right-0 p-4 pt-12 pointer-events-none">
          <div className="relative">
            <div className="absolute inset-0 -inset-x-4 bg-gradient-to-t from-background via-background to-transparent" />
            <div className="relative border border-border bg-background pointer-events-auto">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe a task or ask something..."
                rows={3}
                className={cn(
                  "w-full bg-transparent px-3 py-2 text-sm resize-none placeholder:text-muted-foreground focus:outline-none",
                  isSubmitting && "opacity-50",
                )}
                disabled={isSubmitting}
              />
              <div className="flex items-center justify-between px-3 py-2 border-t border-border text-xs text-muted-foreground">
                <span>Enter to send · Shift+Enter for newline</span>
                <span className={cn(input.trim() ? "text-foreground" : "")}>
                  {isSubmitting ? "Sending..." : input.trim() ? "Ready" : ""}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel - Chat */}
      <div className="flex-1 flex flex-col">
        {selectedSession ? (
          <ChatPanel
            session={selectedSession}
            onClose={() => setSelectedSession(null)}
            onExpand={() => openFullEditor(selectedSession.project.id, selectedSession.id)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Select a session to view
          </div>
        )}
      </div>
    </div>
  );
}
