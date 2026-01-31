import { Loader2, Circle, Check } from "lucide-react";

type SessionStatus = "running" | "idle" | "complete";

type SessionItemProps = {
  status: SessionStatus;
  hash: string;
  title: string;
  lastMessage: string;
  avatarUrl?: string;
};

function StatusIcon({ status }: { status: SessionStatus }) {
  switch (status) {
    case "running":
      return <Loader2 size={14} className="animate-spin text-text-secondary" />;
    case "idle":
      return <Circle size={14} className="text-text-muted" strokeDasharray="2 2" />;
    case "complete":
      return <Check size={14} className="text-accent" />;
  }
}

export function SessionItem({ status, hash, title, lastMessage, avatarUrl }: SessionItemProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 hover:bg-bg-hover cursor-pointer">
      <StatusIcon status={status} />
      <span className="text-text-muted font-mono">{hash}</span>
      <span className="text-text truncate">{title}</span>
      <span className="text-text-muted truncate max-w-[50%] ml-auto">{lastMessage}</span>
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="w-5 h-5 shrink-0" />
      ) : (
        <div className="w-5 h-5 bg-bg-subtle shrink-0" />
      )}
    </div>
  );
}
