import { emitReceipt } from './receiptService.js';

async function resolveOption(value, result, args) {
  if (typeof value === 'function') {
    const r = value(result, args);
    return r instanceof Promise ? await r : r;
  }
  return value;
}

/**
 * Wraps a state-mutating service function to auto-emit a receipt on success.
 * Fails closed: if receipt emit fails, the whole operation throws.
 *
 * @param {Function} serviceFn - The original service function.
 * @param {string|Function} receiptKind - Static kind or (result, args) => kind.
 * @param {Object} options - Mappers for receipt fields.
 */
export function withReceipt(serviceFn, receiptKind, options = {}) {
  return async function wrapped(...args) {
    const config = args[0];
    const rawActor = args[1];
    const actor = (rawActor && typeof rawActor === 'object' && rawActor.userId)
      ? rawActor
      : { userId: 'system', role: 'system' };

    const result = await serviceFn(...args);

    const kind = typeof receiptKind === 'function'
      ? receiptKind(result, args)
      : receiptKind;

    const receiptData = {
      kind,
      actor: { userId: actor.userId, role: actor.role },
      subjectUserId: (await resolveOption(options.subjectUserId, result, args)) || actor.userId,
      entityType: await resolveOption(options.entityType, result, args),
      entityId: await resolveOption(options.entityId, result, args),
      beforeState: (await resolveOption(options.beforeState, result, args)) || null,
      afterState: await resolveOption(options.afterState, result, args),
      amount: (await resolveOption(options.amount, result, args)) ?? null,
      currency: (await resolveOption(options.currency, result, args)) ?? null,
      source: (await resolveOption(options.source, result, args)) || 'derived',
      consentOrDisclosureSnapshotRef: (await resolveOption(options.consentOrDisclosureSnapshotRef, result, args)) ?? null,
      taxRegimeVersion: (await resolveOption(options.taxRegimeVersion, result, args)) ?? null,
    };

    await emitReceipt(config, receiptData);
    return result;
  };
}
