import { cc, ptr, toArrayBuffer } from "bun:ffi";
import source from "./native/resize.c" with { type: "file" };

const {
  symbols: { resize_image, free_buffer, deref_ptr },
} = cc({
  source,
  library: ["avcodec", "avformat", "avutil", "swscale"],
  symbols: {
    resize_image: {
      returns: "int",
      args: ["ptr", "usize", "int", "ptr", "ptr", "ptr", "ptr"],
    },
    deref_ptr: {
      returns: "ptr",
      args: ["ptr"],
    },
    free_buffer: {
      returns: "void",
      args: ["ptr"],
    },
  },
});

const MAX_DIMENSION = 1568;

export interface ResizeResult {
  buffer: Buffer;
  width: number;
  height: number;
  wasResized: boolean;
}

/**
 * Resize an image buffer maintaining aspect ratio.
 * Uses FFmpeg's Lanczos algorithm for high-quality downscaling.
 *
 * @param input - Input image buffer (PNG, JPEG, etc.)
 * @param maxDimension - Maximum width/height (default: 1568px for optimal Claude token usage)
 * @returns Resized image buffer with dimensions and resize status
 */
export function resizeImage(
  input: Buffer,
  maxDimension = MAX_DIMENSION
): ResizeResult {
  const outputPtr = new BigUint64Array(1);
  const outputLen = new BigUint64Array(1);
  const outWidth = new Int32Array(1);
  const outHeight = new Int32Array(1);

  const result = resize_image(
    ptr(input),
    input.length,
    maxDimension,
    ptr(outputPtr),
    ptr(outputLen),
    ptr(outWidth),
    ptr(outHeight)
  );

  if (result < 0) {
    throw new Error(`FFmpeg resize failed with code ${result}`);
  }

  const outPtr = deref_ptr(ptr(outputPtr));
  if (!outPtr) {
    throw new Error("FFmpeg resize returned a null output buffer");
  }

  const len = Number(outputLen[0]);

  const view = toArrayBuffer(outPtr, 0, len);
  const outputBuffer = Buffer.alloc(len);
  outputBuffer.set(new Uint8Array(view));

  free_buffer(outPtr);

  return {
    buffer: outputBuffer,
    width: outWidth[0] ?? 0,
    height: outHeight[0] ?? 0,
    wasResized: input.length !== len,
  };
}

/**
 * Resize a base64-encoded image maintaining aspect ratio.
 *
 * @param base64 - Base64-encoded image data
 * @param maxDimension - Maximum width/height (default: 1568px)
 * @returns Base64-encoded resized image
 */
export function resizeBase64(
  base64: string,
  maxDimension = MAX_DIMENSION
): string {
  const input = Buffer.from(base64, "base64");
  const { buffer } = resizeImage(input, maxDimension);
  return buffer.toString("base64");
}

/**
 * Resize a base64-encoded image and return full result info.
 *
 * @param base64 - Base64-encoded image data
 * @param maxDimension - Maximum width/height (default: 1568px)
 * @returns Resize result with base64 data, dimensions, and resize status
 */
export function resizeBase64WithInfo(
  base64: string,
  maxDimension = MAX_DIMENSION
): ResizeResult & { base64: string } {
  const input = Buffer.from(base64, "base64");
  const result = resizeImage(input, maxDimension);
  return {
    ...result,
    base64: result.buffer.toString("base64"),
  };
}
