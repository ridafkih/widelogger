export function formatUniqueHostname(
  sessionId: string,
  containerId: string
): string {
  return `s-${sessionId.slice(0, 8)}-${containerId.slice(0, 8)}`;
}

export function formatProxyUrl(
  sessionId: string,
  port: number,
  baseDomain: string
): string {
  return `http://${sessionId}--${port}.${baseDomain}`;
}

export function formatNetworkAlias(sessionId: string, port: number): string {
  return `${sessionId}--${port}`;
}

export function formatWorkspacePath(sessionId: string): string {
  return `/workspaces/${sessionId}`;
}

export function formatContainerWorkspacePath(
  sessionId: string,
  containerId: string
): string {
  return `/workspaces/${sessionId}/${containerId}`;
}
