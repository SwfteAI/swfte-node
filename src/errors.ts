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
 * Raised when authentication fails (HTTP 401 or 403). Never retried.
 */
export class AuthenticationError extends SwfteError {
  /** HTTP status that caused the error (401 or 403), when it came from a response. */
  readonly status?: number;

  constructor(message: string = 'Authentication failed', status?: number) {
    super(message);
    this.name = 'AuthenticationError';
    this.status = status;
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Raised when rate limit is exceeded (HTTP 429).
 */
export class RateLimitError extends SwfteError {
  /** Seconds the server asked the caller to wait (`Retry-After`), when it sent one. */
  readonly retryAfter?: number;
  readonly status: number = 429;

  constructor(message: string = 'Rate limit exceeded', retryAfter?: number) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
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


/**
 * Raised when a workflow run reaches a terminal status other than success
 * (FAILED, TIMEOUT, CANCELLED/CANCELED). `execution` holds the final status payload.
 */
export class WorkflowExecutionError extends SwfteError {
  readonly executionId: string;
  readonly status: string;
  readonly execution: unknown;

  constructor(message: string, executionId: string, status: string, execution?: unknown) {
    super(message);
    this.name = 'WorkflowExecutionError';
    this.executionId = executionId;
    this.status = status;
    this.execution = execution;
    Object.setPrototypeOf(this, WorkflowExecutionError.prototype);
  }
}

/**
 * Raised when polling gives up before a workflow run finishes. The run is NOT
 * cancelled; poll `executionId` again to follow it.
 */
/**
 * A run stopped to wait for a person (HUMAN_INPUT gate) or an external event.
 * Only thrown with `throwOnPause: true`; by default invokeAndWait resolves with
 * `paused: true`. The run is not failed: resume it (Studio, or the resume API) and
 * poll `executionId` again.
 */
export class WorkflowPausedError extends SwfteError {
  readonly executionId: string;
  readonly status: string;
  readonly waitingFor: Array<{ nodeId: string; nodeType?: string; status: string; reason?: string }>;
  readonly execution: unknown;

  constructor(
    message: string,
    executionId: string,
    status: string,
    waitingFor: Array<{ nodeId: string; nodeType?: string; status: string; reason?: string }> = [],
    execution?: unknown
  ) {
    super(message);
    this.name = 'WorkflowPausedError';
    this.executionId = executionId;
    this.status = status;
    this.waitingFor = waitingFor;
    this.execution = execution;
    Object.setPrototypeOf(this, WorkflowPausedError.prototype);
  }
}

export class WorkflowTimeoutError extends SwfteError {
  readonly executionId: string;
  readonly lastStatus: unknown;

  constructor(message: string, executionId: string, lastStatus?: unknown) {
    super(message);
    this.name = 'WorkflowTimeoutError';
    this.executionId = executionId;
    this.lastStatus = lastStatus;
    Object.setPrototypeOf(this, WorkflowTimeoutError.prototype);
  }
}

/**
 * Raised when a request does not finish within the configured `timeout`.
 * Retried only for idempotent calls (GET/HEAD/OPTIONS, or a call that carries an
 * idempotency key).
 */
export class RequestTimeoutError extends SwfteError {
  constructor(message: string = 'Request timed out') {
    super(message);
    this.name = 'RequestTimeoutError';
    Object.setPrototypeOf(this, RequestTimeoutError.prototype);
  }
}
