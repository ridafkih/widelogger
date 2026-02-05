import { LABELS } from "../config/constants";
import { formatNetworkName } from "../shared/naming";
import { findActiveSessionsForReconciliation } from "../repositories/session.repository";
import type { Sandbox } from "../types/dependencies";

export interface NetworkContainerNames {
  browserContainerName?: string;
  opencodeContainerName?: string;
}

export async function createSessionNetwork(
  sessionId: string,
  containerNames: NetworkContainerNames,
  sandbox: Sandbox,
): Promise<string> {
  const { provider, network: networkManager } = sandbox;
  const networkName = formatNetworkName(sessionId);

  await provider.createNetwork(networkName, { labels: { [LABELS.SESSION]: sessionId } });

  if (containerNames.browserContainerName) {
    try {
      await networkManager.connectContainer(containerNames.browserContainerName, networkName);
    } catch (error) {
      console.warn(
        `[Network] Failed to connect browser container to network ${networkName}:`,
        error,
      );
    }
  }

  if (containerNames.opencodeContainerName) {
    try {
      await networkManager.connectContainer(containerNames.opencodeContainerName, networkName);
    } catch (error) {
      console.warn(
        `[Network] Failed to connect opencode container to network ${networkName}:`,
        error,
      );
    }
  }

  return networkName;
}

export async function cleanupSessionNetwork(
  sessionId: string,
  containerNames: NetworkContainerNames,
  sandbox: Sandbox,
): Promise<void> {
  const { network: networkManager } = sandbox;
  const networkName = formatNetworkName(sessionId);

  if (containerNames.browserContainerName) {
    try {
      await networkManager.disconnectContainer(containerNames.browserContainerName, networkName);
    } catch (error) {
      console.warn(`[Network] Failed to disconnect browser from network ${networkName}:`, error);
    }
  }

  if (containerNames.opencodeContainerName) {
    try {
      await networkManager.disconnectContainer(containerNames.opencodeContainerName, networkName);
    } catch (error) {
      console.warn(`[Network] Failed to disconnect opencode from network ${networkName}:`, error);
    }
  }

  await networkManager.removeNetwork(networkName);
}

export async function cleanupOrphanedNetworks(
  containerNames: NetworkContainerNames,
  sandbox: Sandbox,
): Promise<number> {
  const { provider } = sandbox;

  const networks = await provider.listNetworks({
    labels: [LABELS.SESSION],
  });

  const activeSessions = await findActiveSessionsForReconciliation();
  const activeSessionIds = new Set(activeSessions.map(({ id }) => id));

  const orphanedSessionIds = networks
    .map(({ labels }) => labels[LABELS.SESSION])
    .filter((id): id is string => !!id && !activeSessionIds.has(id));

  await Promise.all(
    orphanedSessionIds.map((sessionId) =>
      cleanupSessionNetwork(sessionId, containerNames, sandbox).catch((error) =>
        console.warn("[Network] Session network cleanup failed:", error),
      ),
    ),
  );

  return orphanedSessionIds.length;
}

export async function reconcileNetworkConnections(
  containerNames: NetworkContainerNames,
  sandbox: Sandbox,
): Promise<void> {
  const { provider, network: networkManager } = sandbox;

  const activeSessions = await findActiveSessionsForReconciliation();

  if (activeSessions.length === 0) {
    return;
  }

  console.log(`[Network] Reconciling network connections for ${activeSessions.length} sessions`);

  for (const session of activeSessions) {
    const networkName = formatNetworkName(session.id);

    const networkExists = await provider.networkExists(networkName);

    if (!networkExists) {
      continue;
    }

    if (containerNames.browserContainerName) {
      try {
        await networkManager.connectContainer(containerNames.browserContainerName, networkName);
      } catch (error) {
        console.warn(`[Network] Failed to reconnect browser to network ${networkName}:`, error);
      }
    }

    if (containerNames.opencodeContainerName) {
      try {
        await networkManager.connectContainer(containerNames.opencodeContainerName, networkName);
      } catch (error) {
        console.warn(`[Network] Failed to reconnect opencode to network ${networkName}:`, error);
      }
    }
  }

  console.log(`[Network] Network reconciliation complete`);
}
