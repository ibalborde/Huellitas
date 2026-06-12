/**
 * Typed errors for the data layer.
 *
 * `message` is technical (for logs / future Sentry); `userMessage` is ready
 * to render in the UI, in es-AR. Repositories never swallow backend errors:
 * they wrap them in a DataError and rethrow, so React Query exposes them
 * through its error state.
 */
export class DataError extends Error {
  /** Friendly, es-AR message safe to show to the user. */
  readonly userMessage: string;

  constructor(message: string, userMessage: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'DataError';
    this.userMessage = userMessage;
  }
}

export function isDataError(error: unknown): error is DataError {
  return error instanceof DataError;
}

/** Fallback es-AR message for errors that are not a DataError. */
export const GENERIC_ERROR_MESSAGE = 'Algo salió mal. Probá de nuevo en un rato.';

/** Extracts a UI-ready es-AR message from any thrown value. */
export function getUserMessage(error: unknown): string {
  return isDataError(error) ? error.userMessage : GENERIC_ERROR_MESSAGE;
}
