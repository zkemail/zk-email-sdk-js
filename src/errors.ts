/**
 * Error thrown when proof verification fails due to an unexpected error.
 * This is distinct from a proof being invalid - this indicates something
 * went wrong during the verification process itself.
 */
export class VerificationError extends Error {
  public readonly cause?: Error;

  constructor(message: string, options?: { cause?: Error }) {
    super(message);
    this.name = "VerificationError";
    this.cause = options?.cause;
  }
}

/**
 * Error codes returned by the conductor API
 */
export const ErrorCode = {
  // Validation errors (400)
  INVALID_REQUEST: "INVALID_REQUEST",
  INVALID_SLUG: "INVALID_SLUG",
  INVALID_VERSION: "INVALID_VERSION",
  INVALID_BODY: "INVALID_BODY",
  INVALID_QUERY: "INVALID_QUERY",

  // Auth errors (401, 403)
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",

  // Not found errors (404)
  NOT_FOUND: "NOT_FOUND",
  BLUEPRINT_NOT_FOUND: "BLUEPRINT_NOT_FOUND",
  PROOF_NOT_FOUND: "PROOF_NOT_FOUND",

  // Conflict errors (409)
  ALREADY_EXISTS: "ALREADY_EXISTS",

  // Internal errors (500)
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * API error response structure from conductor
 */
export interface ApiErrorResponse {
  error: string;
  code?: string;
  details?: unknown;
}

/**
 * Custom error class for API errors with error codes
 */
export class ApiError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(message: string, statusCode: number, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code || ErrorCode.INTERNAL_ERROR;
    this.details = details;
  }

  /**
   * Check if error is a specific error code
   */
  is(errorCode: ErrorCodeType): boolean {
    return this.code === errorCode;
  }

  /**
   * Check if error is a validation error (400)
   */
  isValidationError(): boolean {
    return this.statusCode === 400;
  }

  /**
   * Check if error is an auth error (401 or 403)
   */
  isAuthError(): boolean {
    return this.statusCode === 401 || this.statusCode === 403;
  }

  /**
   * Check if error is a not found error (404)
   */
  isNotFoundError(): boolean {
    return this.statusCode === 404;
  }

  /**
   * Check if error is a server error (5xx)
   */
  isServerError(): boolean {
    return this.statusCode >= 500;
  }

  /**
   * Create ApiError from fetch response and parsed body
   */
  static fromResponse(statusCode: number, body: ApiErrorResponse | string): ApiError {
    if (typeof body === "string") {
      return new ApiError(body, statusCode);
    }

    return new ApiError(body.error, statusCode, body.code, body.details);
  }
}
