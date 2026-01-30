import {
  FrameResponse,
  type FrameReceiver,
  type FrameReceiverConfig,
} from "@lab/browser-orchestration";

export type { FrameReceiver, FrameReceiverConfig };

const DEFAULT_WS_HOST = "browser";

export const createFrameReceiver = (
  port: number,
  onFrame: (frame: string, timestamp: number) => void,
  onClose: () => void,
  config?: FrameReceiverConfig,
): FrameReceiver => {
  const wsHost = config?.wsHost ?? DEFAULT_WS_HOST;
  const ws = new WebSocket(`ws://${wsHost}:${port}`);

  const handleMessage = (event: MessageEvent) => {
    const data = event.data.toString();
    const parsed = FrameResponse.safeParse(JSON.parse(data));
    if (!parsed.success) return;
    onFrame(parsed.data.data, Date.now());
  };

  const handleError = () => ws.close();

  const handleClose = () => {
    ws.removeEventListener("message", handleMessage);
    ws.removeEventListener("error", handleError);
    ws.removeEventListener("close", handleClose);
    onClose();
  };

  ws.addEventListener("message", handleMessage);
  ws.addEventListener("error", handleError);
  ws.addEventListener("close", handleClose);

  return { close: () => ws.close() };
};
