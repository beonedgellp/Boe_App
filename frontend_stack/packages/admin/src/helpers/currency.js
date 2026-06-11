// Indian currency formatting: lakh-crore grouping via en-IN.

const RUPEE_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function formatRupeesFromPaise(paise) {
  const value = Number(paise);
  if (paise === null || paise === undefined || !Number.isFinite(value)) return '';
  return RUPEE_FORMATTER.format(value / 100);
}

// Parses an admin-typed rupee amount ("1,25,000", "₹499") into integer
// paise. Returns null for empty input and NaN for invalid input.
export function parseRupeesToPaise(input) {
  const cleaned = String(input ?? '').replace(/[₹,\s]/g, '');
  if (cleaned === '') return null;
  const rupees = Number(cleaned);
  if (!Number.isFinite(rupees) || rupees < 0) return NaN;
  return Math.round(rupees * 100);
}
