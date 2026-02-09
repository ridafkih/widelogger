import type { PlatformType } from "../types/messages";
import type { PlatformAdapter } from "./types";

const adapters = new Map<PlatformType, PlatformAdapter>();

export function registerAdapter(adapter: PlatformAdapter): void {
  adapters.set(adapter.platform, adapter);
}

export function getAdapter(
  platform: PlatformType
): PlatformAdapter | undefined {
  return adapters.get(platform);
}

export function getAllAdapters(): PlatformAdapter[] {
  return Array.from(adapters.values());
}
