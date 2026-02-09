"use client";

import { useState } from "react";

interface ContentTextProps {
  children: string;
  maxLines?: number;
  collapsible?: boolean;
}

function ContentText({
  children,
  maxLines = 10,
  collapsible = true,
}: ContentTextProps) {
  const [expanded, setExpanded] = useState(false);

  const lines = children.split("\n");
  const totalLines = lines.length;
  const needsTruncation = collapsible && totalLines > maxLines;
  const visibleLines =
    expanded || !needsTruncation ? lines : lines.slice(0, maxLines);
  const hiddenCount = totalLines - maxLines;

  return (
    <div className="flex flex-col gap-1">
      <pre className="wrap-break-word whitespace-pre-wrap font-mono text-xs">
        {visibleLines.join("\n")}
      </pre>
      {needsTruncation && (
        <button
          className="self-start text-text-muted text-xs hover:text-text-secondary"
          onClick={() => setExpanded(!expanded)}
          type="button"
        >
          {expanded ? "Show less" : `Show ${hiddenCount} more lines`}
        </button>
      )}
    </div>
  );
}

export { ContentText };
