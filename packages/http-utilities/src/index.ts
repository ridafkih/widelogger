/**
 * HTTP Status codes commonly used in API responses.
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * CORS headers for cross-origin requests.
 */
export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Lab-Session-Id",
} as const;

/**
 * Adds CORS headers to an existing Response.
 * When an origin is provided, uses credentialed CORS instead of wildcard.
 */
export function withCors(response: Response, origin?: string): Response {
  if (origin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
  } else {
    response.headers.set("Access-Control-Allow-Origin", "*");
  }
  response.headers.set(
    "Access-Control-Allow-Methods",
    CORS_HEADERS["Access-Control-Allow-Methods"]
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    CORS_HEADERS["Access-Control-Allow-Headers"]
  );
  return response;
}

/**
 * Creates a 400 Bad Request response.
 */
export function badRequestResponse(message = "Bad request"): Response {
  return new Response(message, { status: HTTP_STATUS.BAD_REQUEST });
}

/**
 * Creates a 404 Not Found response.
 */
export function notFoundResponse(message = "Not found"): Response {
  return new Response(message, { status: HTTP_STATUS.NOT_FOUND });
}

/**
 * Creates a 500 Internal Server Error response.
 */
export function errorResponse(message = "Internal server error"): Response {
  return new Response(message, { status: HTTP_STATUS.INTERNAL_SERVER_ERROR });
}

/**
 * Creates a 405 Method Not Allowed response.
 */
export function methodNotAllowedResponse(): Response {
  return new Response("Method not allowed", {
    status: HTTP_STATUS.METHOD_NOT_ALLOWED,
  });
}

/**
 * Creates a 204 No Content response.
 */
export function noContentResponse(): Response {
  return new Response(null, { status: HTTP_STATUS.NO_CONTENT });
}

/**
 * Creates a 503 Service Unavailable response.
 */
export function serviceUnavailableResponse(
  message = "Service unavailable"
): Response {
  return new Response(message, { status: HTTP_STATUS.SERVICE_UNAVAILABLE });
}

/**
 * Creates an OPTIONS response with CORS headers.
 * When an origin is provided, uses credentialed CORS instead of wildcard.
 */
export function optionsResponse(origin?: string): Response {
  const response = new Response(null, { status: HTTP_STATUS.NO_CONTENT });
  return withCors(response, origin);
}

/**
 * Builds headers for Server-Sent Events (SSE) responses.
 */
export function buildSseHeaders(): Record<string, string> {
  return {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    ...CORS_HEADERS,
  };
}

/**
 * Creates a Server-Sent Events (SSE) Response.
 */
export function buildSseResponse(
  body: ReadableStream<Uint8Array> | null,
  status = 200
): Response {
  return new Response(body, {
    status,
    headers: buildSseHeaders(),
  });
}

/**
 * Creates a JSON error response (for APIs that return JSON errors).
 */
export function jsonErrorResponse(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}
