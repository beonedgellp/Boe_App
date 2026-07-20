const COPY_REGISTRY = {
  'v1.0': {
    pending_payment: 'Your payment is being processed. You will receive a confirmation once it is complete.',
    payment_received: 'Payment confirmed. Units will be allotted within 1-2 business days.',
    units_pending: 'Units are being allotted. Check back in 1-2 business days.',
    units_allotted: 'Investment complete. Track performance in your Portfolio.',
    mandate_pending: 'Please authorize your mandate in your UPI app.',
    mandate_active: 'Mandate authorized. SIP installments will begin on schedule.',
    mandate_failed: 'Mandate authorization failed. Please retry or contact support.',
    redemption_requested: 'Redemption request submitted. Approval typically takes 1-2 business days.',
    redemption_paid: 'Redemption processed. Funds will reach your account within 2-3 business days.',
    failed_refund_pending: 'Refund is being processed. Contact support if not received within 5 business days.',
  },
};

const DEFAULT_TEXT = 'Your request is being processed. Check back soon for updates.';
const VERSIONS = Object.keys(COPY_REGISTRY);

export function getCopy(version, moneyState) {
  const registry = COPY_REGISTRY[version] || COPY_REGISTRY[getLatestVersion()];
  if (!moneyState) return DEFAULT_TEXT;
  return registry[moneyState] || DEFAULT_TEXT;
}

export function getLatestVersion() {
  return VERSIONS[VERSIONS.length - 1];
}
