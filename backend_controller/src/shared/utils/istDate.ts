function formatToParts(date: any, options: any) {
  return new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', ...options }).formatToParts(date);
}

function partValue(parts: any, type: any) {
  return parts.find((p: any) => p.type === type)?.value;
}

export function dateInIst(date = new Date()) {
  const parts = formatToParts(date, { year: 'numeric', month: '2-digit', day: '2-digit' });
  const year = partValue(parts, 'year');
  const month = partValue(parts, 'month');
  const day = partValue(parts, 'day');
  return `${year}-${month}-${day}`;
}

export function nowIst() {
  return dateInIst(new Date());
}

export function istDateObject(date = new Date()) {
  const str = dateInIst(date);
  return new Date(str + 'T00:00:00+05:30');
}
