/**
 * Error classes for the Swfte SDK.
 */

/**
 * Base error class for Swfte SDK errors.
 */
export class SwfteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SwfteError';
    Object.setPrototypeOf(this, SwfteError.prototype);
  }
}

/**
 * Raised when authentication fails.
 */
export class AuthenticationError extends SwfteError {
  constructor(message: string = 'Authentication failed') {
    super(message);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Raised when rate limit is exceeded.
 */
export class RateLimitError extends SwfteError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message);
    this.name = 'RateLimitError';
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * Raised when the API returns an error.
 */
export class APIError extends SwfteError {
  readonly status: number;
  readonly body?: unknown;

  constructor(message: string, status: number = 500, body?: unknown) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.body = body;
    Object.setPrototypeOf(this, APIError.prototype);
  }
}

/**
 * Raised when the request is invalid.
 */
export class InvalidRequestError extends SwfteError {
  constructor(message: string = 'Invalid request') {
    super(message);
    this.name = 'InvalidRequestError';
    Object.setPrototypeOf(this, InvalidRequestError.prototype);
  }
}

