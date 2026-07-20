/**
 * Canonical MoneyState enum — unified state abstraction shared by frontend and backend.
 * Maps to PostgreSQL enums: payment_status, mandate_status, transaction_status, investment_plan_status.
 */

export const MoneyState = Object.freeze({
  PENDING_PAYMENT: 'pending_payment',
  PAYMENT_RECEIVED: 'payment_received',
  UNITS_PENDING: 'units_pending',
  UNITS_ALLOTTED: 'units_allotted',
  MANDATE_PENDING: 'mandate_pending',
  MANDATE_ACTIVE: 'mandate_active',
  MANDATE_FAILED: 'mandate_failed',
  REDEMPTION_REQUESTED: 'redemption_requested',
  REDEMPTION_PAID: 'redemption_paid',
  FAILED_REFUND_PENDING: 'failed_refund_pending',
});

const ALL_VALUES: string[] = Object.values(MoneyState);

export function isValidMoneyState(value: any) {
  return typeof value === 'string' && ALL_VALUES.includes(value);
}

/**
 * Map a MoneyState to the corresponding payment_status enum value(s).
 * @param {string} moneyState
 * @returns {string[] | null}
 */
export function toPaymentStatus(moneyState: any) {
  switch (moneyState) {
    case MoneyState.PENDING_PAYMENT:
      return ['created', 'gateway_initiated', 'pending'];
    case MoneyState.PAYMENT_RECEIVED:
      return ['success', 'reconciled'];
    case MoneyState.REDEMPTION_PAID:
      return ['success', 'reconciled', 'refunded'];
    case MoneyState.FAILED_REFUND_PENDING:
      return ['failed', 'expired'];
    default:
      return null;
  }
}

/**
 * Map a MoneyState to the corresponding mandate_status enum value(s).
 * @param {string} moneyState
 * @returns {string[] | null}
 */
export function toMandateStatus(moneyState: any) {
  switch (moneyState) {
    case MoneyState.MANDATE_PENDING:
      return ['setup_required', 'created', 'pending_user_auth'];
    case MoneyState.MANDATE_ACTIVE:
      return ['active', 'paused'];
    case MoneyState.MANDATE_FAILED:
      return ['failed', 'revoked', 'expired'];
    default:
      return null;
  }
}

/**
 * Map a MoneyState to the corresponding transaction_status enum value(s).
 * @param {string} moneyState
 * @returns {string[] | null}
 */
export function toTransactionStatus(moneyState: any) {
  switch (moneyState) {
    case MoneyState.PENDING_PAYMENT:
      return ['payment_pending'];
    case MoneyState.PAYMENT_RECEIVED:
      return ['payment_confirmed'];
    case MoneyState.UNITS_PENDING:
      return ['submitted'];
    case MoneyState.UNITS_ALLOTTED:
      return ['allotted'];
    case MoneyState.REDEMPTION_PAID:
      return ['payment_confirmed', 'allotted', 'reversed'];
    case MoneyState.FAILED_REFUND_PENDING:
      return ['payment_failed', 'cancelled'];
    default:
      return null;
  }
}

/**
 * Map a MoneyState to the corresponding investment_plan_status enum value(s).
 * @param {string} moneyState
 * @returns {string[] | null}
 */
export function toInvestmentPlanStatus(moneyState: any) {
  switch (moneyState) {
    case MoneyState.PENDING_PAYMENT:
      return ['pending_first_payment', 'installment_due'];
    case MoneyState.PAYMENT_RECEIVED:
      return ['installment_processing'];
    case MoneyState.UNITS_PENDING:
      return ['submitted'];
    case MoneyState.UNITS_ALLOTTED:
      return ['active', 'installment_success'];
    case MoneyState.MANDATE_PENDING:
      return ['pending_mandate_setup', 'mandate_pending_user_auth'];
    case MoneyState.MANDATE_ACTIVE:
      return ['active'];
    case MoneyState.MANDATE_FAILED:
      return ['first_payment_failed'];
    case MoneyState.REDEMPTION_REQUESTED:
      return ['withdrawal_requested', 'cancel_requested'];
    case MoneyState.REDEMPTION_PAID:
      return ['closed', 'cancelled'];
    case MoneyState.FAILED_REFUND_PENDING:
      return ['first_payment_failed', 'installment_failed'];
    default:
      return null;
  }
}
