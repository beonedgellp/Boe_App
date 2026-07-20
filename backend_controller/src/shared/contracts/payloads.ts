import { isValidMoneyState } from './moneyState.js';

function plainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function assertPlainObject(value, name) {
  if (!plainObject(value)) {
    throw new TypeError(`${name} must be a plain object.`);
  }
}

function assertString(value, name) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`${name} must be a non-empty string.`);
  }
}

function assertNumber(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number.`);
  }
}

function assertOptionalNumber(value, name) {
  if (value !== undefined && value !== null && (typeof value !== 'number' || !Number.isFinite(value))) {
    throw new TypeError(`${name} must be a finite number or null/undefined.`);
  }
}

function assertDateString(value, name) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(value)) {
    throw new TypeError(`${name} must be an ISO date string.`);
  }
}

function assertOptionalString(value, name) {
  if (value !== undefined && value !== null && typeof value !== 'string') {
    throw new TypeError(`${name} must be a string or null/undefined.`);
  }
}

function assertArray(value, name) {
  if (!Array.isArray(value)) {
    throw new TypeError(`${name} must be an array.`);
  }
}

function assertOptionalArray(value, name) {
  if (value !== undefined && value !== null && !Array.isArray(value)) {
    throw new TypeError(`${name} must be an array or null/undefined.`);
  }
}

function assertMoneyState(value, name) {
  if (!isValidMoneyState(value)) {
    throw new TypeError(`${name} must be a valid MoneyState value.`);
  }
}

/**
 * @typedef {Object} PortfolioSummary
 * @property {number} currentValue
 * @property {number} invested
 * @property {number} allTimeGain
 * @property {number} allTimeGainPct
 * @property {number} todayChange
 * @property {number} xirrPct
 * @property {string} asOf
 * @property {boolean} staleFlag
 * @property {HoldingSnapshot[]} holdings
 */

export function validatePortfolioSummary(payload) {
  assertPlainObject(payload, 'PortfolioSummary');
  assertOptionalNumber(payload.currentValue, 'currentValue');
  assertNumber(payload.invested, 'invested');
  assertOptionalNumber(payload.allTimeGain, 'allTimeGain');
  assertOptionalNumber(payload.allTimeGainPct, 'allTimeGainPct');
  assertOptionalNumber(payload.todayChange, 'todayChange');
  assertOptionalNumber(payload.xirrPct, 'xirrPct');
  assertDateString(payload.asOf, 'asOf');
  if (payload.staleFlag !== undefined && typeof payload.staleFlag !== 'boolean') {
    throw new TypeError('staleFlag must be a boolean.');
  }
  assertArray(payload.holdings, 'holdings');
  payload.holdings.forEach((h, i) => {
    try {
      validateHoldingSnapshot(h);
    } catch (err) {
      throw new TypeError(`holdings[${i}]: ${err.message}`);
    }
  });
  return payload;
}

/**
 * @typedef {Object} HoldingSnapshot
 * @property {string} fundId
 * @property {string} fundName
 * @property {number} units
 * @property {number} invested
 * @property {string} status - MoneyState
 */

export function validateHoldingSnapshot(payload) {
  assertPlainObject(payload, 'HoldingSnapshot');
  assertString(payload.fundId, 'fundId');
  assertString(payload.fundName, 'fundName');
  assertNumber(payload.units, 'units');
  assertNumber(payload.invested, 'invested');
  assertMoneyState(payload.status, 'status');
  return payload;
}

/**
 * @typedef {Object} ProductDetail
 * @property {string} id
 * @property {string} name
 * @property {string} tagline
 * @property {string} status
 * @property {string} riskLevel
 * @property {string} riskLabel
 * @property {Object} allocation
 * @property {Object[]} topHoldings
 * @property {Object} fees
 * @property {string} horizon
 * @property {number} disclosureVersion
 * @property {string} disclosureText
 * @property {Object} providerConfig
 */

export function validateProductDetail(payload) {
  assertPlainObject(payload, 'ProductDetail');
  assertString(payload.id, 'id');
  assertString(payload.name, 'name');
  assertString(payload.tagline, 'tagline');
  assertString(payload.status, 'status');
  assertString(payload.riskLevel, 'riskLevel');
  assertString(payload.riskLabel, 'riskLabel');
  assertPlainObject(payload.allocation, 'allocation');
  assertArray(payload.topHoldings, 'topHoldings');
  assertPlainObject(payload.fees, 'fees');
  assertString(payload.horizon, 'horizon');
  assertNumber(payload.disclosureVersion, 'disclosureVersion');
  assertString(payload.disclosureText, 'disclosureText');
  assertPlainObject(payload.providerConfig, 'providerConfig');
  return payload;
}

/**
 * @typedef {Object} SipCreateResponse
 * @property {string} planId
 * @property {string} paymentId
 * @property {string} mandateId
 * @property {string} status - MoneyState
 * @property {string} nextAction
 * @property {string} reviewUrl
 */

export function validateSipCreateResponse(payload) {
  assertPlainObject(payload, 'SipCreateResponse');
  assertString(payload.planId, 'planId');
  assertString(payload.paymentId, 'paymentId');
  assertString(payload.mandateId, 'mandateId');
  assertMoneyState(payload.status, 'status');
  assertString(payload.nextAction, 'nextAction');
  assertString(payload.reviewUrl, 'reviewUrl');
  return payload;
}

/**
 * @typedef {Object} PaymentStatus
 * @property {string} id
 * @property {number} amount
 * @property {string} status - MoneyState
 * @property {string} providerRef
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {Object[]} attempts
 * @property {string|null} failureReason
 */

export function validatePaymentStatus(payload) {
  assertPlainObject(payload, 'PaymentStatus');
  assertString(payload.id, 'id');
  assertNumber(payload.amount, 'amount');
  assertMoneyState(payload.status, 'status');
  assertString(payload.providerRef, 'providerRef');
  assertDateString(payload.createdAt, 'createdAt');
  assertDateString(payload.updatedAt, 'updatedAt');
  assertArray(payload.attempts, 'attempts');
  assertOptionalString(payload.failureReason, 'failureReason');
  return payload;
}

/**
 * @typedef {Object} MandateStatus
 * @property {string} id
 * @property {string} status - MoneyState
 * @property {number} maxAmount
 * @property {string} frequency
 * @property {number} debitDay
 * @property {string|null} validityEnd
 * @property {string} providerRef
 * @property {string|null} authorizedAt
 */

export function validateMandateStatus(payload) {
  assertPlainObject(payload, 'MandateStatus');
  assertString(payload.id, 'id');
  assertMoneyState(payload.status, 'status');
  assertNumber(payload.maxAmount, 'maxAmount');
  assertString(payload.frequency, 'frequency');
  assertNumber(payload.debitDay, 'debitDay');
  assertOptionalString(payload.validityEnd, 'validityEnd');
  assertString(payload.providerRef, 'providerRef');
  assertOptionalString(payload.authorizedAt, 'authorizedAt');
  return payload;
}
