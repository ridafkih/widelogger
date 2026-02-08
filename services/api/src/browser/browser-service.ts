import {
  type Orchestrator,
  type BrowserSessionState,
  type SessionSnapshot,
  type StateStore,
  type DaemonController,
  type FrameReceiver,
  createOrchestrator,
  createFrameReceiver,
  createDaemonEventSubscriber,
} from "@lab/browser-protocol";
import { widelog } from "../logging";

export interface BrowserServiceConfig {
  browserWsHost: string;
  browserDaemonUrl: string;
  cleanupDelayMs: number;
  reconcileIntervalMs: number;
  maxRetries: number;
}

export interface BrowserServiceDependencies {
  stateStore: StateStore;
  daemonController: DaemonController;
  publishFrame: (sessionId: string, frame: string, timestamp: number) => void;
  publishStateChange: (sessionId: string, state: BrowserSessionState) => void;
  getFirstExposedPort?: (sessionId: string) => Promise<number | null>;
  getInitialNavigationUrl?: (sessionId: string, port: number) => string | Promise<string>;
  waitForService?: (sessionId: string, port: number) => Promise<void>;
}

export interface BrowserService {
  getBrowserSnapshot(sessionId: string): Promise<SessionSnapshot>;
  subscribeBrowser(sessionId: string): Promise<SessionSnapshot>;
  unsubscribeBrowser(sessionId: string): Promise<SessionSnapshot>;
  warmUpBrowser(sessionId: string): Promise<SessionSnapshot>;
  forceStopBrowser(sessionId: string): Promise<void>;
  getCachedFrame(sessionId: string): string | null;
  startReconciler(): void;
  stopReconciler(): void;
}

export const createBrowserService = async (
  config: BrowserServiceConfig,
  deps: BrowserServiceDependencies,
): Promise<BrowserService> => {
  const { stateStore, daemonController, publishFrame, publishStateChange } = deps;
  const { browserWsHost, browserDaemonUrl, cleanupDelayMs, reconcileIntervalMs, maxRetries } =
    config;

  const eventSubscriber = createDaemonEventSubscriber({ browserDaemonUrl });

  const frameReceivers = new Map<string, FrameReceiver>();

  const connectFrameReceiver = async (
    sessionId: string,
    port: number,
    orchestrator: Orchestrator,
  ) => {
    return widelog.context(async () => {
      widelog.set("event_name", "browser.frame_receiver.connect");
      widelog.set("session_id", sessionId);
      widelog.set("stream_port", port);
      widelog.time.start("duration_ms");

      try {
        if (frameReceivers.has(sessionId)) {
          widelog.set("outcome", "already_connected");
          return;
        }

        const status = await daemonController.getStatus(sessionId);
        if (!status?.running) {
          widelog.set("daemon_running", false);
          widelog.set("outcome", "skipped");
          await stateStore.setCurrentState(sessionId, "stopped", { streamPort: null });
          return;
        }

        widelog.set("daemon_running", true);
        await daemonController.launch(sessionId);

        const receiver = createFrameReceiver(
          port,
          (frame, timestamp) => {
            orchestrator.setCachedFrame(sessionId, frame);
            publishFrame(sessionId, frame, timestamp);
          },
          () => frameReceivers.delete(sessionId),
          { wsHost: browserWsHost },
        );

        frameReceivers.set(sessionId, receiver);
        widelog.set("outcome", "success");
      } catch (error) {
        widelog.set("outcome", "error");
        widelog.errorFields(error);
      } finally {
        widelog.time.stop("duration_ms");
        widelog.flush();
      }
    });
  };

  const disconnectFrameReceiver = (sessionId: string) => {
    const receiver = frameReceivers.get(sessionId);
    if (!receiver) return;
    receiver.close();
    frameReceivers.delete(sessionId);
  };

  const orchestrator = createOrchestrator(stateStore, daemonController, {
    ...deps,
    maxRetries,
    reconcileIntervalMs,
    cleanupDelayMs,
  });

  orchestrator.onStateChange((sessionId: string, state: BrowserSessionState) => {
    widelog.context(async () => {
      widelog.set("event_name", "browser.state_change");
      widelog.set("session_id", sessionId);
      widelog.set("current_state", state.currentState);
      if (state.streamPort) widelog.set("stream_port", state.streamPort);

      publishStateChange(sessionId, state);

      if (state.currentState === "running" && state.streamPort) {
        await connectFrameReceiver(sessionId, state.streamPort, orchestrator);
      } else {
        disconnectFrameReceiver(sessionId);
      }

      widelog.flush();
    });
  });

  orchestrator.onError((error: unknown) => {
    widelog.context(() => {
      widelog.set("event_name", "browser.orchestrator.reconciliation_error");
      widelog.set("active_frame_receivers", frameReceivers.size);
      widelog.set("reconcile_interval_ms", reconcileIntervalMs);
      widelog.set("max_retries", maxRetries);
      widelog.set("outcome", "error");
      widelog.errorFields(error);
      widelog.flush();
    });
  });

  eventSubscriber.onEvent((event) => {
    widelog.context(async () => {
      widelog.set("event_name", "browser.handle_daemon_event");

      try {
        await orchestrator.handleDaemonEvent(event);
        widelog.set("outcome", "success");
      } catch (error) {
        widelog.set("outcome", "error");
        widelog.errorFields(error);
      }

      widelog.flush();
    });
  });

  return {
    async getBrowserSnapshot(sessionId: string) {
      const snapshot = await orchestrator.getSnapshot(sessionId);
      return {
        sessionId: snapshot.sessionId,
        desiredState: snapshot.desiredState,
        currentState: snapshot.currentState,
        streamPort: snapshot.streamPort,
        errorMessage: snapshot.errorMessage,
        subscriberCount: snapshot.subscriberCount,
      };
    },

    async subscribeBrowser(sessionId: string) {
      return orchestrator.subscribe(sessionId);
    },

    unsubscribeBrowser(sessionId: string) {
      return orchestrator.unsubscribe(sessionId);
    },

    async warmUpBrowser(sessionId: string) {
      return orchestrator.warmUp(sessionId);
    },

    async forceStopBrowser(sessionId: string) {
      await orchestrator.forceStop(sessionId);
    },

    getCachedFrame(sessionId: string) {
      return orchestrator.getCachedFrame(sessionId);
    },

    startReconciler() {
      eventSubscriber.start();
    },

    stopReconciler() {
      eventSubscriber.stop();
    },
  };
};
