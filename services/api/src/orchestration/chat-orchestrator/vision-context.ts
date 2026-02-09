import type { ImageAnalyzerContext } from "@lab/subagents/vision";
import { widelog } from "../../logging";

// Lazily created ImageAnalyzerContext singleton (promise-based to prevent race conditions)
let visionContextPromise: Promise<ImageAnalyzerContext | undefined> | null =
  null;

export function getVisionContext(): Promise<ImageAnalyzerContext | undefined> {
  if (visionContextPromise) {
    return visionContextPromise;
  }
  visionContextPromise = (async () => {
    try {
      const { createVisionContextFromEnv } = await import(
        "@lab/subagents/vision"
      );
      const ctx = createVisionContextFromEnv();
      widelog.set("orchestration.vision_context.enabled", Boolean(ctx));
      return ctx;
    } catch (error) {
      widelog.errorFields(error, {
        prefix: "orchestration.vision_context.init_error",
      });
      return undefined;
    }
  })();
  return visionContextPromise;
}
