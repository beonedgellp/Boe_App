import { HttpError } from './errors.js';
import type { UnknownRecord } from '#types/index.js';

type HeaderValue = string | number | string[];
type OutgoingHeaders = Record<string, HeaderValue>;

export function requestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Low-level JSON send for raw http.ServerResponse (used by test scripts). */
export function sendJson(
  res: any,
  status: number,
  payload: unknown,
  headers: OutgoingHeaders = {},
): void {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    ...headers,
  });
  res.end(body);
}

export function sendNoContent(res: any, headers: OutgoingHeaders = {}): void {
  res.writeHead(204, headers);
  res.end();
}

export function sendError(
  res: any,
  error: unknown,
  context: { requestId?: string } = {},
): void {
  const httpError = error instanceof HttpError ? error : null;
  const status = httpError ? httpError.status : 500;
  const code = httpError ? httpError.code : 'INTERNAL_ERROR';
  const message =
    status === 500 ? 'Unexpected server error.' : error instanceof Error ? error.message : String(error);
  const details = httpError ? httpError.details : undefined;

  sendJson(res, status, {
    ok: false,
    error: {
      code,
      message,
      details,
    },
    requestId: context.requestId,
  });
}

// Body parsing is now handled by express.json() middleware.
// readJsonBody is no longer needed — Express parses JSON automatically.
