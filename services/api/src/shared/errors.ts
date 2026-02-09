export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class InternalError extends AppError {
  constructor(message = "Internal server error", code = "INTERNAL_ERROR") {
    super(message, code, 500);
    this.name = "InternalError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      id ? `${resource} with id ${id} not found` : `${resource} not found`,
      "NOT_FOUND",
      404
    );
    this.name = "NotFoundError";
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = "Service unavailable", code = "SERVICE_UNAVAILABLE") {
    super(message, code, 503);
    this.name = "ServiceUnavailableError";
  }
}

export class ExternalServiceError extends AppError {
  constructor(
    message = "Upstream service request failed",
    code = "EXTERNAL_SERVICE_ERROR"
  ) {
    super(message, code, 502);
    this.name = "ExternalServiceError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR", 400);
    this.name = "ValidationError";
  }
}

export class ConfigurationError extends AppError {
  constructor(message: string) {
    super(message, "CONFIGURATION_ERROR", 500);
    this.name = "ConfigurationError";
  }
}

export function orThrow<T>(
  value: T | null | undefined,
  resource: string,
  id?: string
): T {
  if (value == null) {
    throw new NotFoundError(resource, id);
  }
  return value;
}

/**
 * Safely extracts error message from an unknown value.
 */
export function getErrorMessage(
  error: unknown,
  fallback = "An error occurred"
): string {
  return error instanceof Error ? error.message : fallback;
}

export function throwOnOpencodeError(
  response: { error?: unknown },
  message: string,
  code: string
): void {
  if (response.error) {
    throw new ExternalServiceError(
      `${message}: ${JSON.stringify(response.error)}`,
      code
    );
  }
}
