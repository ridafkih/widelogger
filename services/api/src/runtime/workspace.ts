import { formatContainerWorkspacePath } from "../shared/naming";
import type { Sandbox } from "../types/dependencies";

export async function initializeContainerWorkspace(
  sessionId: string,
  containerId: string,
  image: string,
  sandbox: Sandbox
): Promise<string> {
  const containerWorkspace = formatContainerWorkspacePath(
    sessionId,
    containerId
  );
  return sandbox.workspace.startWorkspace(containerWorkspace, image);
}
