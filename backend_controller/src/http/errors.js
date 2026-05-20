export class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function notImplemented(route, nextStep) {
  return new HttpError(501, 'NOT_IMPLEMENTED', `${route} is registered but not implemented yet.`, {
    nextStep,
  });
}
