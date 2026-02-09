import type { ImageConfig } from "./provider";

export interface ImageManager {
  pullImage(
    ref: string,
    onProgress?: (event: { status: string; progress?: string }) => void
  ): Promise<void>;
  imageExists(ref: string): Promise<boolean>;
  getImageWorkdir(ref: string): Promise<string>;
  getImageConfig(ref: string): Promise<ImageConfig>;
}
