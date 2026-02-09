import { findActiveSessionsForReconciliation } from "../repositories/session.repository";
import type { Sandbox } from "../types/dependencies";

function formatNetworkName(sessionId: string): string {
  return `lab-${sessionId}`;
}

export async function createSessionNetwork(
  sessionId: string,
  sandbox: Sandbox
): Promise<string> {
  const network = await sandbox.session.createSessionNetwork(sessionId);
  return network.id;
}

export async function cleanupSessionNetwork(
  sessionId: string,
  sandbox: Sandbox
): Promise<void> {
  await sandbox.session.removeSessionNetwork(sessionId);
}

export async function cleanupOrphanedNetworks(
  sandbox: Sandbox
): Promise<number> {
  const activeSessions = await findActiveSessionsForReconciliation();
  const activeSessionIds = new Set(activeSessions.map(({ id }) => id));

  return sandbox.session.cleanupOrphanedSessionNetworks([...activeSessionIds]);
}

export async function reconcileNetworkConnections(
  sandbox: Sandbox
): Promise<void> {
  const activeSessions = await findActiveSessionsForReconciliation();
  await sandbox.session.reconcileSessionNetworks(
    activeSessions.map((session) => session.id)
  );
}

async function ensureSharedContainerConnected(
  sessionId: string,
  containerName: string,
  sandbox: Sandbox
): Promise<boolean> {
  const networkName = formatNetworkName(sessionId);
  const networkExists = await sandbox.provider.networkExists(networkName);
  if (!networkExists) {
    return false;
  }

  const isConnected = await sandbox.provider.isConnectedToNetwork(
    containerName,
    networkName
  );
  if (isConnected) {
    return true;
  }

  await sandbox.provider.connectToNetwork(containerName, networkName);
  return true;
}

export async function ensureSharedContainerConnectedToActiveSessions(
  containerName: string,
  sandbox: Sandbox
): Promise<{ checked: number; connected: number; missingNetworks: number }> {
  const activeSessions = await findActiveSessionsForReconciliation();
  let connected = 0;
  let missingNetworks = 0;

  for (const { id: sessionId } of activeSessions) {
    const didConnect = await ensureSharedContainerConnected(
      sessionId,
      containerName,
      sandbox
    );
    if (didConnect) {
      connected++;
    } else {
      missingNetworks++;
    }
  }

  return { checked: activeSessions.length, connected, missingNetworks };
}
