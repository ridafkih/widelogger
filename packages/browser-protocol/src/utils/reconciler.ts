import type {
  DaemonController,
  Reconciler,
  ReconcilerConfig,
  StateStore,
  StateStoreOptions,
} from "../types/orchestrator";
import type { BrowserSessionState, CurrentState } from "../types/session";
import { type Action, computeRequiredAction } from "../utils/state-machine";

export type { Reconciler, ReconcilerConfig } from "../types/orchestrator";

export const createReconciler = (
  stateStore: StateStore,
  daemonController: DaemonController,
  config: ReconcilerConfig
): Reconciler => {
  const updateCurrentState = (
    sessionId: string,
    currentState: CurrentState,
    options: StateStoreOptions = {}
  ): Promise<BrowserSessionState> => {
    return stateStore.setCurrentState(sessionId, currentState, options);
  };

  const startSession = async (session: BrowserSessionState): Promise<void> => {
    const { sessionId, retryCount } = session;

    if (retryCount >= config.maxRetries) {
      return;
    }

    await updateCurrentState(sessionId, "starting", {
      retryCount: retryCount + 1,
      errorMessage: null,
    });

    try {
      const { port } = await daemonController.start(
        sessionId,
        session.lastUrl ?? undefined
      );
      await updateCurrentState(sessionId, "starting", { streamPort: port });
    } catch (error) {
      await updateCurrentState(sessionId, "stopped", {
        streamPort: null,
        errorMessage:
          error instanceof Error ? error.message : "Failed to start daemon",
      });
    }
  };

  const stopSession = async (session: BrowserSessionState): Promise<void> => {
    const { sessionId } = session;

    const currentUrl = await daemonController.getCurrentUrl(sessionId);
    if (currentUrl && currentUrl !== "about:blank") {
      await stateStore.setLastUrl(sessionId, currentUrl);
    }

    await updateCurrentState(sessionId, "stopping");
    await daemonController.stop(sessionId);

    await updateCurrentState(sessionId, "stopped", {
      streamPort: null,
      errorMessage: null,
      retryCount: 0,
    });
  };

  const checkDaemonReady = async (
    session: BrowserSessionState
  ): Promise<void> => {
    const { sessionId } = session;

    const status = await daemonController.getStatus(sessionId);
    if (!status?.ready) {
      return;
    }

    await updateCurrentState(sessionId, "running", { streamPort: status.port });

    if (session.lastUrl && session.lastUrl !== "about:blank") {
      await daemonController.navigate(sessionId, session.lastUrl);
    } else if (!session.lastUrl && config.getFirstExposedPort) {
      const port = await config.getFirstExposedPort(sessionId);
      if (port) {
        const url = `http://${sessionId}--${port}:${port}/`;
        await daemonController.navigate(sessionId, url);
      }
    }
  };

  const checkDaemonAlive = async (
    session: BrowserSessionState
  ): Promise<void> => {
    const { sessionId } = session;

    const status = await daemonController.getStatus(sessionId);
    if (!status?.running) {
      await updateCurrentState(sessionId, "stopped");
    }
  };

  const checkStoppingComplete = async (
    session: BrowserSessionState
  ): Promise<void> => {
    const { sessionId } = session;

    const status = await daemonController.getStatus(sessionId);
    if (!status?.running) {
      await updateCurrentState(sessionId, "stopped");
    }
  };

  const resetToStopped = async (
    session: BrowserSessionState
  ): Promise<void> => {
    const { sessionId } = session;

    await updateCurrentState(sessionId, "stopped", {
      streamPort: null,
      errorMessage: null,
    });
  };

  const executeAction = async (
    session: BrowserSessionState,
    action: Action
  ): Promise<void> => {
    switch (action) {
      case "StartDaemon":
        return startSession(session);
      case "StopDaemon":
        return stopSession(session);
      case "WaitForReady":
        if (session.currentState === "starting") {
          return checkDaemonReady(session);
        }
        if (session.currentState === "stopping") {
          return checkStoppingComplete(session);
        }
        if (session.currentState === "running") {
          return checkDaemonAlive(session);
        }
        return;
      case "ResetToStopped":
        return resetToStopped(session);
      case "NoOp":
        return;
    }
  };

  const reconcileSession = async (
    session: BrowserSessionState
  ): Promise<void> => {
    const action = computeRequiredAction(
      session.desiredState,
      session.currentState
    );
    await executeAction(session, action);
  };

  const reconcileAll = async (): Promise<void> => {
    const sessions = await stateStore.getAllSessions();
    const errors: Array<{ sessionId: string; error: unknown }> = [];

    for (const session of sessions) {
      try {
        await reconcileSession(session);
      } catch (error) {
        errors.push({ sessionId: session.sessionId, error });
      }
    }

    if (errors.length > 0) {
      throw new AggregateError(
        errors.map((e) => e.error),
        `Reconciliation failed for ${errors.length} session(s): ${errors.map((e) => e.sessionId).join(", ")}`
      );
    }
  };

  return { reconcileSession, reconcileAll };
};
