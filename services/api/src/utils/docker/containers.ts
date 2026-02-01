import { docker } from "../../clients/docker";
import { config } from "../../config/environment";
import { LABELS, VOLUMES } from "../../config/constants";
import {
  formatProjectName,
  formatContainerName,
  formatUniqueHostname,
  formatNetworkAlias,
} from "../../types/session";
import {
  findContainersByProjectId,
  findPortsByContainerId,
  findEnvVarsByContainerId,
  updateSessionContainerDockerId,
  updateSessionContainersStatusBySessionId,
} from "../repositories/container.repository";
import { deleteSession, findSessionById } from "../repositories/session.repository";
import { proxyManager, isProxyInitialized, ensureProxyInitialized } from "../proxy";
import { publisher } from "../../clients/publisher";
import type { BrowserService } from "../browser/browser-service";
import { createSessionNetwork, cleanupSessionNetwork } from "./network";
import { initializeContainerWorkspace } from "./workspace";

interface ClusterContainer {
  containerId: string;
  hostname: string;
  ports: Record<number, number>;
}

export async function initializeSessionContainers(
  sessionId: string,
  projectId: string,
  browserService: BrowserService,
): Promise<void> {
  const containerDefinitions = await findContainersByProjectId(projectId);
  const dockerIds: string[] = [];
  const clusterContainers: ClusterContainer[] = [];

  let networkName: string;

  try {
    networkName = await createSessionNetwork(sessionId);

    const preparedContainers = await Promise.all(
      containerDefinitions.map(async (containerDefinition) => {
        const [ports, envVars, containerWorkspace] = await Promise.all([
          findPortsByContainerId(containerDefinition.id),
          findEnvVarsByContainerId(containerDefinition.id),
          initializeContainerWorkspace(
            sessionId,
            containerDefinition.id,
            containerDefinition.image,
          ),
        ]);

        return { containerDefinition, ports, envVars, containerWorkspace };
      }),
    );

    for (const { containerDefinition, ports, envVars, containerWorkspace } of preparedContainers) {
      const env: Record<string, string> = {};
      for (const envVar of envVars) {
        env[envVar.key] = envVar.value;
      }

      const serviceHostname = containerDefinition.hostname ?? containerDefinition.id;
      const uniqueHostname = formatUniqueHostname(sessionId, containerDefinition.id);
      const projectName = formatProjectName(sessionId);
      const containerName = formatContainerName(sessionId, containerDefinition.id);

      const containerVolumes = [
        { source: VOLUMES.WORKSPACES_HOST_PATH, target: "/workspaces" },
        { source: config.browserSocketVolume, target: VOLUMES.BROWSER_SOCKET_DIR },
      ];
      env.AGENT_BROWSER_SOCKET_DIR = VOLUMES.BROWSER_SOCKET_DIR;
      env.AGENT_BROWSER_SESSION = sessionId;

      const dockerId = await docker.createContainer({
        name: containerName,
        image: containerDefinition.image,
        hostname: uniqueHostname,
        networkMode: networkName,
        workdir: containerWorkspace,
        env: Object.keys(env).length > 0 ? env : undefined,
        ports: ports.map(({ port }) => ({ container: port, host: undefined })),
        volumes: containerVolumes,
        labels: {
          "com.docker.compose.project": projectName,
          "com.docker.compose.service": serviceHostname,
          [LABELS.SESSION]: sessionId,
          [LABELS.PROJECT]: projectId,
          [LABELS.CONTAINER]: containerDefinition.id,
        },
      });

      dockerIds.push(dockerId);
      await updateSessionContainerDockerId(sessionId, containerDefinition.id, dockerId);
      await docker.startContainer(dockerId);

      const portMap: Record<number, number> = {};
      const networkAliases: string[] = [];
      for (const { port } of ports) {
        portMap[port] = port;
        networkAliases.push(formatNetworkAlias(sessionId, port));
      }

      if (networkAliases.length > 0) {
        await docker.disconnectFromNetwork(dockerId, networkName);
        await docker.connectToNetwork(dockerId, networkName, { aliases: networkAliases });
      }

      if (Object.keys(portMap).length > 0) {
        clusterContainers.push({
          containerId: containerDefinition.id,
          hostname: uniqueHostname,
          ports: portMap,
        });
      }
    }

    await ensureProxyInitialized();
    if (isProxyInitialized() && clusterContainers.length > 0) {
      await proxyManager.registerCluster(sessionId, networkName, clusterContainers);
    }

    const session = await findSessionById(sessionId);
    if (!session || session.status === "deleting") {
      console.log(`Session ${sessionId} was deleted during initialization, cleaning up`);
      await cleanupOrphanedContainers(sessionId, dockerIds, browserService);
      return;
    }
  } catch (error) {
    console.error(`Failed to initialize session ${sessionId}:`, error);
    await handleInitializationError(sessionId, projectId, dockerIds, browserService);
  }
}

async function cleanupOrphanedContainers(
  sessionId: string,
  dockerIds: string[],
  browserService: BrowserService,
): Promise<void> {
  await Promise.all(
    dockerIds.map((dockerId) =>
      docker
        .stopContainer(dockerId)
        .then(() => docker.removeContainer(dockerId))
        .catch((error) =>
          console.error(`Failed to cleanup orphaned container ${dockerId}:`, error),
        ),
    ),
  );

  if (isProxyInitialized()) {
    try {
      await proxyManager.unregisterCluster(sessionId);
    } catch (error) {
      console.warn(`Failed to unregister proxy cluster for orphaned session ${sessionId}:`, error);
    }
  }

  await cleanupSessionNetwork(sessionId).catch((error) =>
    console.error(`Failed to cleanup network for orphaned session ${sessionId}:`, error),
  );

  await browserService.forceStopBrowser(sessionId);
}

async function handleInitializationError(
  sessionId: string,
  projectId: string,
  dockerIds: string[],
  browserService: BrowserService,
): Promise<void> {
  const errorContainers = await updateSessionContainersStatusBySessionId(sessionId, "error");

  for (const container of errorContainers) {
    publisher.publishDelta(
      "sessionContainers",
      { uuid: sessionId },
      { type: "update", container: { id: container.id, status: "error" } },
    );
  }

  await Promise.all(
    dockerIds.map((dockerId) =>
      docker
        .stopContainer(dockerId)
        .then(() => docker.removeContainer(dockerId))
        .catch((error) => console.error(`Failed to cleanup container ${dockerId}:`, error)),
    ),
  );

  await cleanupSessionNetwork(sessionId).catch((error) =>
    console.error(`Failed to cleanup network for session ${sessionId}:`, error),
  );

  await browserService.forceStopBrowser(sessionId);
  await deleteSession(sessionId);

  publisher.publishDelta("sessions", {
    type: "remove",
    session: { id: sessionId, projectId, title: null },
  });
}
