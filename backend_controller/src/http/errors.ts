export class HttpError extends Error {
  public status: number;
  public code: string;
  public details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function notImplemented(route: string, nextStep?: string): HttpError {
  return new HttpError(501, 'NOT_IMPLEMENTED', `${route} is registered but not implemented yet.`, {
    nextStep,
  });
}
