"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { use } from "react";
import { Header, PageFrame } from "@/components/layout-primitives";
import { useSessionTitle } from "@/lib/use-session-title";
import { useSessionContext } from "../../layout";

interface FileReviewPageProps {
  params: Promise<{ sessionId: string }>;
}

export default function FileReviewPage({ params }: FileReviewPageProps) {
  const { sessionId } = use(params);
  const searchParams = useSearchParams();
  const filePath = searchParams.get("path");
  const { session, project } = useSessionContext();
  const displayTitle = useSessionTitle(sessionId, session?.title);

  if (!filePath) {
    return (
      <PageFrame>
        <Header>
          <Link
            className="flex items-center gap-1 text-text-muted text-xs hover:text-text"
            href={`/editor/${sessionId}/review`}
          >
            <ArrowLeft size={12} />
            Back to review
          </Link>
        </Header>
        <div className="flex flex-1 items-center justify-center text-text-muted">
          No file path specified
        </div>
      </PageFrame>
    );
  }

  return (
    <PageFrame>
      <Header>
        <Link
          className="flex items-center gap-1 text-text-muted text-xs hover:text-text"
          href={`/editor/${sessionId}/review`}
        >
          <ArrowLeft size={12} />
          Back to review
        </Link>
        <span className="text-text-muted">/</span>
        <span className="truncate font-mono text-text text-xs">{filePath}</span>
      </Header>
      <div className="flex flex-1 items-center justify-center text-text-muted">
        File review for: {filePath}
        <br />
        (Session: {displayTitle ?? sessionId}, Project: {project?.name})
      </div>
    </PageFrame>
  );
}
