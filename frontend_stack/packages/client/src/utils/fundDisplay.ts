// Small pure display helpers for the fund Explore card and detail page.
// Returns are stored as already-percent numbers (e.g. 16.9 -> "16.90%").

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function fundMonogram(name) {
  if (!name || typeof name !== 'string') return '—';
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '—';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

// Format an already-percent value with an explicit sign. Returns null for
// missing/non-finite input so callers can hide the field rather than show "0%".
export function formatReturnPct(value, { decimals = 2, sign = true } = {}) {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const prefix = sign && n > 0 ? '+' : '';
  return `${prefix}${n.toFixed(decimals)}%`;
}

// "2026-05-20" -> "20 May '26" (matches the reference NAV date style).
export function formatNavDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const yy = String(d.getFullYear()).slice(-2);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} '${yy}`;
}

// Sign bucket for color rules: 'pos' | 'neg' | 'flat' (money-state colors only).
export function returnTone(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return 'flat';
  return n > 0 ? 'pos' : 'neg';
}
