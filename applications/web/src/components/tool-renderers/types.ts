export type ToolStatus = "pending" | "running" | "completed" | "error";

export interface ToolRendererProps {
  tool: string;
  callId?: string;
  input?: Record<string, unknown>;
  output?: string | null;
  error?: string | null;
  status: ToolStatus;
}
