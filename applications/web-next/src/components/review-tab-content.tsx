"use client";

import { useState, useEffect } from "react";
import {
  Review,
  type ReviewableFile,
  type BrowserState,
  type BrowserActions,
  type FileNode,
} from "@/components/review";
import { TextAreaGroup } from "@/components/textarea-group";
import {
  mockReviewFiles,
  mockFileTree,
  mockFileTreeContents,
  mockFileContents,
} from "@/placeholder/data";

function useMockFileBrowser(sessionId: string | null) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [loadedContents, setLoadedContents] = useState<Map<string, FileNode[]>>(new Map());
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);

  useEffect(() => {
    setExpandedPaths(new Set());
    setLoadedContents(new Map());
    setSelectedPath(null);
    setPreviewContent(null);
  }, [sessionId]);

  const state: BrowserState = {
    rootNodes: mockFileTree,
    expandedPaths,
    loadedContents,
    loadingPaths: new Set(),
    rootLoading: false,
    selectedPath,
    previewContent,
    previewLoading: false,
  };

  const actions: BrowserActions = {
    toggleDirectory: (path) => {
      if (expandedPaths.has(path)) {
        setExpandedPaths((prev) => {
          const next = new Set(prev);
          next.delete(path);
          return next;
        });
        return;
      }

      if (!loadedContents.has(path) && mockFileTreeContents[path]) {
        setLoadedContents((prev) => new Map(prev).set(path, mockFileTreeContents[path]));
      }
      setExpandedPaths((prev) => new Set([...prev, path]));
    },
    selectFile: (path) => {
      setSelectedPath(path);
      setPreviewContent(mockFileContents[path] ?? "// File not found");
    },
    clearFileSelection: () => {
      setSelectedPath(null);
      setPreviewContent(null);
    },
  };

  return { state, actions };
}

function useReviewFiles(sessionId: string | null) {
  const [files, setFiles] = useState<ReviewableFile[]>([]);

  useEffect(() => {
    const initialFiles = sessionId ? (mockReviewFiles[sessionId] ?? []) : [];
    setFiles(initialFiles);
  }, [sessionId]);

  const dismiss = (path: string) => {
    setFiles((prev) =>
      prev.map((file) => (file.path === path ? { ...file, status: "dismissed" as const } : file)),
    );
  };

  const pendingFiles = files.filter((file) => file.status === "pending");

  return { files, pendingFiles, dismiss };
}

function ReviewFeedbackForm() {
  return (
    <Review.Feedback>
      <Review.FeedbackHeader>
        <Review.FeedbackLocation />
      </Review.FeedbackHeader>
      <TextAreaGroup.Input placeholder="Your feedback will be submitted to the agent..." rows={2} />
      <TextAreaGroup.Toolbar>
        <TextAreaGroup.Submit />
      </TextAreaGroup.Toolbar>
    </Review.Feedback>
  );
}

type ReviewTabContentProps = {
  sessionId: string;
};

export function ReviewTabContent({ sessionId }: ReviewTabContentProps) {
  const { files, pendingFiles, dismiss } = useReviewFiles(sessionId);
  const browser = useMockFileBrowser(sessionId);

  return (
    <Review.Provider files={files} onDismiss={dismiss} browser={browser}>
      <Review.Frame>
        <Review.MainPanel>
          <Review.Empty />
          <Review.DiffView>
            <Review.DiffHeader />
            <Review.DiffList>
              {pendingFiles.map((file) => (
                <Review.DiffItem key={file.path} file={file}>
                  <Review.FileHeader>
                    <Review.FileHeaderIcon />
                    <Review.FileHeaderLabel />
                    <Review.FileHeaderDismiss />
                  </Review.FileHeader>
                  <Review.Diff />
                </Review.DiffItem>
              ))}
            </Review.DiffList>
            <ReviewFeedbackForm />
          </Review.DiffView>
          <Review.PreviewHeader />
          <Review.PreviewView>
            <Review.PreviewContent />
            <ReviewFeedbackForm />
          </Review.PreviewView>
        </Review.MainPanel>
        <Review.SidePanel>
          <Review.Browser>
            <Review.BrowserHeader />
            <Review.BrowserTree />
          </Review.Browser>
        </Review.SidePanel>
      </Review.Frame>
    </Review.Provider>
  );
}
