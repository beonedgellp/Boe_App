// Indian-style number formatting helpers shared by app surfaces.

function formatNumberMoney(n, { decimals = 0, sign = false } = {}) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const neg = n < 0;
  const abs = Math.abs(n);
  const fixed = abs.toFixed(decimals);
  const [intPart, decPart] = fixed.split('.');
  let s = intPart;
  if (intPart.length > 3) {
    const last3 = intPart.slice(-3);
    let rest = intPart.slice(0, -3);
    rest = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    s = rest + ',' + last3;
  }
  return '₹' + (sign && !neg ? '+' : '') + (neg ? '−' : '') + s + (decPart ? '.' + decPart : '');
}

export function fmtMoney(n, { decimals = 0, sign = false, source, asOf, currency = 'INR' } = {}) {
  if (source !== undefined && asOf !== undefined) {
    return formatMoney(n, { source, asOf, currency, decimals, sign }).display;
  }
  return formatNumberMoney(n, { decimals, sign });
}

export function formatMoney(amount, { source, asOf, currency = 'INR', decimals = 0, sign = false } = {}) {
  if (source === undefined) {
    throw new TypeError('formatMoney requires source');
  }
  if (asOf === undefined) {
    throw new TypeError('formatMoney requires asOf');
  }
  const display = formatNumberMoney(amount, { decimals, sign });
  return { display, source, asOf, currency };
}

export function fmtNum(n, decimals = 0) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const fixed = Number(n).toFixed(decimals);
  const [i, d] = fixed.split('.');
  return d ? `${i}.${d}` : i;
}

export function fmtPct(n, { sign = true, decimals = 1 } = {}) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const neg = n < 0;
  const abs = Math.abs(n).toFixed(decimals);
  const s = (sign && !neg ? '+' : '') + (neg ? '−' : '') + abs;
  return s + '\u2009%';
}

export function fmtUnits(n) {
  return fmtNum(n, 4);
}

export function fmtDate(iso, { withTime = false } = {}) {
  if (!iso) return '—';
  const d = new Date(iso);
  const day = d.getDate();
  const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
  const yr = d.getFullYear();
  if (!withTime) return `${day} ${mon} ${yr}`;
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${day} ${mon} ${yr}, ${h}:${m} ${ampm} IST`;
}

export function relativeDay(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const today = new Date();
  const diffDays = Math.floor((today - d) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return 'Earlier';
  return 'Earlier';
}
