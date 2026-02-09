"use client";

import { useState } from "react";

interface ContentErrorProps {
  children: string;
  maxLines?: number;
}

function ContentError({ children, maxLines = 5 }: ContentErrorProps) {
  const [expanded, setExpanded] = useState(false);

  const lines = children.split("\n");
  const totalLines = lines.length;
  const needsTruncation = totalLines > maxLines;
  const visibleLines =
    expanded || !needsTruncation ? lines : lines.slice(0, maxLines);
  const hiddenCount = totalLines - maxLines;

  return (
    <div className="flex flex-col gap-1 text-red-500">
      <pre className="wrap-break-word whitespace-pre-wrap font-mono text-xs">
        {expanded || !needsTruncation ? children : visibleLines.join("\n")}
      </pre>
      {needsTruncation && (
        <button
          className="self-start text-red-400 text-xs hover:text-red-300"
          onClick={() => setExpanded(!expanded)}
          type="button"
        >
          {expanded ? "Show less" : `Show ${hiddenCount} more lines`}
        </button>
      )}
    </div>
  );
}

export { ContentError };
