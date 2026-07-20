import type { IncomingMessage, ServerResponse } from 'node:http';
import { HttpError } from './errors.js';
import type { UnknownRecord } from '#types/index.js';

type HeaderValue = string | number | string[];
type OutgoingHeaders = Record<string, HeaderValue>;

export function requestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function sendJson(
  res: ServerResponse,
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

export function sendNoContent(res: ServerResponse, headers: OutgoingHeaders = {}): void {
  res.writeHead(204, headers);
  res.end();
}

export function sendError(
  res: ServerResponse,
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

const MAX_BODY_SIZE = 1024 * 1024; // 1 MB

export async function readJsonBody(req: IncomingMessage): Promise<UnknownRecord> {
  const chunks: Buffer[] = [];
  let totalSize = 0;

  for await (const chunk of req) {
    const buf = chunk as Buffer;
    totalSize += buf.length;
    if (totalSize > MAX_BODY_SIZE) {
      throw new HttpError(413, 'PAYLOAD_TOO_LARGE', 'Request body exceeds 1 MB limit.');
    }
    chunks.push(buf);
  }
  if (chunks.length === 0) return {};

  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};

  req.rawBody = raw;

  try {
    return JSON.parse(raw) as UnknownRecord;
  } catch {
    throw new HttpError(400, 'INVALID_JSON', 'Request body must be valid JSON.');
  }
}
