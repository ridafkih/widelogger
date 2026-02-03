import * as net from "node:net";
import * as fs from "node:fs";
import type { Page } from "playwright-core";
import { BrowserManager } from "agent-browser/dist/browser.js";
import { StreamServer } from "agent-browser/dist/stream-server.js";
import { executeCommand } from "agent-browser/dist/actions.js";
import { parseCommand, serializeResponse, errorResponse } from "agent-browser/dist/protocol.js";
import type { DaemonWorkerConfig } from "./daemon-process";

declare var self: Worker;

function isDaemonWorkerConfig(value: unknown): value is DaemonWorkerConfig {
  if (typeof value !== "object" || value === null) return false;
  if (!("sessionId" in value) || typeof value.sessionId !== "string") return false;
  if (!("streamPort" in value) || typeof value.streamPort !== "number") return false;
  if (!("cdpPort" in value) || typeof value.cdpPort !== "number") return false;
  if (!("socketDir" in value) || typeof value.socketDir !== "string") return false;
  return true;
}

const state: {
  browser: BrowserManager | null;
  streamServer: StreamServer | null;
  socketServer: net.Server | null;
} = { browser: null, streamServer: null, socketServer: null };

const setupPageEvents = (sessionId: string, page: Page) => {
  page.on("console", (msg) => {
    console.log(`[DaemonWorker:${sessionId}] Console ${msg.type()}:`, msg.text());
    postMessage({ type: "browser:console", data: { level: msg.type(), text: msg.text() } });
  });

  page.on("pageerror", (error) => {
    console.error(`[DaemonWorker:${sessionId}] Page error:`, error.message);
    postMessage({ type: "browser:error", data: { message: error.message } });
  });

  page.on("request", (request) => {
    console.log(`[DaemonWorker:${sessionId}] Request:`, request.method(), request.url());
    postMessage({ type: "browser:request", data: { method: request.method(), url: request.url() } });
  });

  page.on("response", (response) => {
    console.log(`[DaemonWorker:${sessionId}] Response:`, response.status(), response.url());
    postMessage({ type: "browser:response", data: { status: response.status(), url: response.url() } });
  });

  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) {
      console.log(`[DaemonWorker:${sessionId}] Navigated:`, frame.url());
      postMessage({ type: "browser:navigated", data: { url: frame.url() } });
    }
  });

  page.on("load", () => {
    console.log(`[DaemonWorker:${sessionId}] Page loaded`);
    postMessage({ type: "browser:loaded" });
  });

  page.on("close", () => {
    console.log(`[DaemonWorker:${sessionId}] Page closed`);
    postMessage({ type: "browser:closed" });
  });
};

const setupBrowserEvents = (sessionId: string, browser: BrowserManager) => {
  const trackedPages = new Set<Page>();

  const trackPage = (page: Page) => {
    if (trackedPages.has(page)) return;
    trackedPages.add(page);
    setupPageEvents(sessionId, page);
  };

  trackPage(browser.getPage());

  const playwrightBrowser = browser.getBrowser();
  if (playwrightBrowser) {
    for (const context of playwrightBrowser.contexts()) {
      context.on("page", async (newPage) => {
        console.log(`[DaemonWorker:${sessionId}] New page opened`);
        trackPage(newPage);

        const pages = browser.getPages();
        const newIndex = pages.indexOf(newPage);
        if (newIndex !== -1 && newIndex !== browser.getActiveIndex()) {
          console.log(`[DaemonWorker:${sessionId}] Auto-switching to new tab ${newIndex}`);
          await browser.switchTo(newIndex);
          postMessage({ type: "browser:tab_switched", data: { index: newIndex, url: newPage.url() } });
        }
      });
    }
  }
};

const createSocketServer = (
  sessionId: string,
  socketPath: string,
  browser: BrowserManager,
): net.Server => {
  if (fs.existsSync(socketPath)) {
    fs.unlinkSync(socketPath);
  }

  const server = net.createServer((socket) => {
    let buffer = "";

    socket.on("data", async (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const parseResult = parseCommand(line);

          if (!parseResult.success) {
            socket.write(
              serializeResponse(errorResponse(parseResult.id ?? "unknown", parseResult.error)) +
                "\n",
            );
            continue;
          }

          const response = await executeCommand(parseResult.command, browser);
          socket.write(serializeResponse(response) + "\n");
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          socket.write(serializeResponse(errorResponse("error", message)) + "\n");
        }
      }
    });

    socket.on("error", () => {});
  });

  server.listen(socketPath, () => {
    console.log(`[DaemonWorker:${sessionId}] Socket server listening on ${socketPath}`);
  });

  server.on("error", (err) => {
    console.error(`[DaemonWorker:${sessionId}] Socket server error:`, err);
  });

  return server;
};

const startWorker = async (config: DaemonWorkerConfig) => {
  const { sessionId, streamPort, cdpPort, socketDir, profilePath } = config;
  const socketPath = `${socketDir}/${sessionId}.sock`;
  const pidFile = `${socketDir}/${sessionId}.pid`;
  const streamPortFile = `${socketDir}/${sessionId}.stream`;
  const cdpPortFile = `${socketDir}/${sessionId}.cdp`;

  console.log(`[DaemonWorker:${sessionId}] Starting browser on stream port ${streamPort}, CDP port ${cdpPort}`);

  if (!fs.existsSync(socketDir)) {
    fs.mkdirSync(socketDir, { recursive: true });
  }

  fs.writeFileSync(pidFile, process.pid.toString());
  fs.writeFileSync(streamPortFile, streamPort.toString());
  fs.writeFileSync(cdpPortFile, cdpPort.toString());

  try {
    state.browser = new BrowserManager();

    await state.browser.launch({
      id: sessionId,
      action: "launch",
      headless: true,
      profile: profilePath,
      args: [`--remote-debugging-port=${cdpPort}`],
    });

    console.log(`[DaemonWorker:${sessionId}] Browser launched`);
    setupBrowserEvents(sessionId, state.browser);

    state.socketServer = createSocketServer(sessionId, socketPath, state.browser);

    state.streamServer = new StreamServer(state.browser, streamPort);
    await state.streamServer.start();

    console.log(`[DaemonWorker:${sessionId}] Stream server started on port ${streamPort}`);
    postMessage({ type: "daemon:started" });
    postMessage({ type: "daemon:ready", data: { port: streamPort } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[DaemonWorker:${sessionId}] Failed to start:`, message);
    postMessage({ type: "daemon:error", error: message });
    process.exit(1);
  }

  self.onmessage = async (event: MessageEvent) => {
    const { type, data } = event.data;

    switch (type) {
      case "navigate":
        if (state.browser) {
          state.browser
            .getPage()
            .goto(data.url)
            .catch((err: Error) => {
              console.error(`[DaemonWorker:${sessionId}] Navigation error:`, err.message);
            });
        }
        break;

      case "executeCommand": {
        const { requestId, command } = data;
        if (!state.browser) {
          postMessage({
            type: "commandResponse",
            data: {
              requestId,
              response: { id: command.id, success: false, error: "Browser not initialized" },
            },
          });
          break;
        }
        try {
          const response = await executeCommand(command, state.browser);
          postMessage({ type: "commandResponse", data: { requestId, response } });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          postMessage({
            type: "commandResponse",
            data: { requestId, response: { id: command.id, success: false, error: message } },
          });
        }
        break;
      }

      case "terminate":
        console.log(`[DaemonWorker:${sessionId}] Terminating`);
        state.socketServer?.close();
        state.streamServer?.stop();
        state.browser?.close();
        try {
          if (fs.existsSync(socketPath)) fs.unlinkSync(socketPath);
          if (fs.existsSync(pidFile)) fs.unlinkSync(pidFile);
          if (fs.existsSync(streamPortFile)) fs.unlinkSync(streamPortFile);
          if (fs.existsSync(cdpPortFile)) fs.unlinkSync(cdpPortFile);
        } catch (error) {
          console.error("Termination error from daemon-worker.ts", error)
        }

        process.exit(0);
    }
  };
};

self.onmessage = (event: MessageEvent) => {
  const { type, data } = event.data;

  if (type === "init" && isDaemonWorkerConfig(data)) {
    startWorker(data);
  }
};

postMessage({ type: "ready" });
