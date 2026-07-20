import { notImplemented } from '#http/errors.js';

export function placeholder(context, nextStep) {
  throw notImplemented(`${context.route.method} ${context.route.path}`, nextStep);
}

export function emptyCollection(meta: any = {}) {
  return {
    items: [],
    page: 1,
    pageSize: 0,
    total: 0,
    ...meta,
  };
}
