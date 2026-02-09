import { ExternalLink, Loader2, RotateCw } from "lucide-react";
import { tv } from "tailwind-variants";
import { IconButton } from "./icon-button";

const urlBar = tv({
  slots: {
    container:
      "flex h-8 shrink-0 items-center gap-2 border-border border-b px-3",
    urlDisplay: "min-w-0 flex-1 truncate text-text-muted text-xs",
    actions: "flex items-center gap-2",
    spinIcon: "size-4 animate-spin",
    icon: "size-4",
  },
});

interface UrlBarProps {
  url: string;
  isLoading?: boolean;
  onRefresh: () => void;
  onOpenExternal?: () => void;
}

export function UrlBar({
  url,
  isLoading,
  onRefresh,
  onOpenExternal,
}: UrlBarProps) {
  const styles = urlBar();

  const handleOpenExternal = () => {
    if (onOpenExternal) {
      onOpenExternal();
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className={styles.container()}>
      <div className={styles.urlDisplay()}>{url}</div>
      <div className={styles.actions()}>
        <IconButton
          aria-label="Refresh"
          disabled={isLoading}
          onClick={onRefresh}
        >
          {isLoading ? (
            <Loader2 className={styles.spinIcon()} />
          ) : (
            <RotateCw className={styles.icon()} />
          )}
        </IconButton>
        <IconButton aria-label="Open in new tab" onClick={handleOpenExternal}>
          <ExternalLink className={styles.icon()} />
        </IconButton>
      </div>
    </div>
  );
}
