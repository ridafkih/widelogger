import type { ZodSchema, ZodError } from "zod";
import { ValidationError } from "./errors";

/**
 * Parses and validates a request body against a Zod schema.
 * Throws ValidationError on invalid JSON or failed validation.
 */
export async function parseRequestBody<T>(request: Request, schema: ZodSchema<T>): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ValidationError("Invalid JSON body");
  }
  const result = schema.safeParse(body);
  if (!result.success) throw new ValidationError(formatZodError(result.error));
  return result.data;
}

/**
 * Formats a Zod error into a human-readable message.
 */
export function formatZodError(error: ZodError): string {
  const issues = error.issues.map((issue) => {
    const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
    return `${path}${issue.message}`;
  });
  return `Validation failed: ${issues.join(", ")}`;
}
