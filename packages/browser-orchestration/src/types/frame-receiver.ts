export interface FrameReceiver {
  close: () => void;
}

export interface FrameReceiverConfig {
  wsHost: string;
}
