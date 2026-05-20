import { HttpError } from './errors.js';

export function requestId() {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function sendJson(res, status, payload, headers = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    ...headers,
  });
  res.end(body);
}

export function sendNoContent(res, headers = {}) {
  res.writeHead(204, headers);
  res.end();
}

export function sendError(res, error, context = {}) {
  const status = error instanceof HttpError ? error.status : 500;
  const code = error instanceof HttpError ? error.code : 'INTERNAL_ERROR';
  const message = status === 500 ? 'Unexpected server error.' : error.message;
  const details = error instanceof HttpError ? error.details : undefined;

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

export async function readJsonBody(req) {
  const chunks = [];
  let totalSize = 0;

  for await (const chunk of req) {
    totalSize += chunk.length;
    if (totalSize > MAX_BODY_SIZE) {
      throw new HttpError(413, 'PAYLOAD_TOO_LARGE', 'Request body exceeds 1 MB limit.');
    }
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};

  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};

  req.rawBody = raw;

  try {
    return JSON.parse(raw);
  } catch {
    throw new HttpError(400, 'INVALID_JSON', 'Request body must be valid JSON.');
  }
}
