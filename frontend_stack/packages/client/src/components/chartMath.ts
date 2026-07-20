// Pure chart geometry helpers (no React, no DOM) so they can be unit-tested
// with the project's node:assert harness. Charts.jsx consumes these.

function toFiniteNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

const round2 = (n) => Math.round(n * 100) / 100;

/* -------------------------------------------------------------------------- */
/* Line comparison geometry                                                   */
/* -------------------------------------------------------------------------- */

// Map a [{ date, fund, nifty }] series into SVG points scaled to a viewbox.
// Both lines share one y-scale so they are visually comparable. A flat series
// (no spread) lands at mid-height instead of dividing by zero.
export function lineChartGeometry(series, { width = 300, height = 80, padding = 6 } = {}) {
  const rows = Array.isArray(series) ? series : [];
  if (rows.length === 0) return { fund: [], nifty: [], min: 0, max: 0 };

  const values = [];
  for (const row of rows) {
    values.push(toFiniteNumber(row.fund), toFiniteNumber(row.nifty));
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const innerH = height - padding * 2;
  const innerW = width - padding * 2;

  const xAt = (i) => (rows.length === 1 ? width / 2 : padding + (innerW * i) / (rows.length - 1));
  const yAt = (value) => {
    if (span === 0) return round2(height / 2);
    const ratio = (toFiniteNumber(value) - min) / span;
    return round2(height - padding - ratio * innerH);
  };

  const fund = rows.map((row, i) => ({ x: round2(xAt(i)), y: yAt(row.fund) }));
  const nifty = rows.map((row, i) => ({ x: round2(xAt(i)), y: yAt(row.nifty) }));
  return { fund, nifty, min, max };
}

export function buildLinePath(points) {
  if (!Array.isArray(points) || points.length === 0) return '';
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${round2(p.x)} ${round2(p.y)}`)
    .join(' ');
}

/* -------------------------------------------------------------------------- */
/* Donut geometry                                                             */
/* -------------------------------------------------------------------------- */

export function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export function describeDonutSlice(cx, cy, outerR, innerR, startAngle, endAngle) {
  const startOuter = polarToCartesian(cx, cy, outerR, endAngle);
  const endOuter = polarToCartesian(cx, cy, outerR, startAngle);
  const startInner = polarToCartesian(cx, cy, innerR, endAngle);
  const endInner = polarToCartesian(cx, cy, innerR, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return [
    'M', round2(startOuter.x), round2(startOuter.y),
    'A', outerR, outerR, 0, largeArcFlag, 0, round2(endOuter.x), round2(endOuter.y),
    'L', round2(endInner.x), round2(endInner.y),
    'A', innerR, innerR, 0, largeArcFlag, 1, round2(startInner.x), round2(startInner.y),
    'Z',
  ].join(' ');
}

// Turn [{ percentage, color, label }] into ring slices. Zero / negative
// percentages are skipped so a single dominant slice still renders cleanly.
export function computeDonutSlices(data, { cx, cy, outerR, innerR, gap = 1 } = {}) {
  const rows = Array.isArray(data) ? data : [];
  const total = rows.reduce((sum, d) => sum + Math.max(0, toFiniteNumber(d.percentage)), 0);
  if (total <= 0) return [];

  let currentAngle = 0;
  const slices = [];
  for (const d of rows) {
    const pct = Math.max(0, toFiniteNumber(d.percentage));
    if (pct <= 0) continue;
    const sliceAngle = (pct / total) * 360;
    const startAngle = currentAngle + gap / 2;
    const endAngle = currentAngle + sliceAngle - gap / 2;
    slices.push({
      path: describeDonutSlice(cx, cy, outerR, innerR, startAngle, endAngle),
      color: d.color,
      label: d.label,
      percentage: pct,
      startAngle: currentAngle,
      endAngle: currentAngle + sliceAngle,
      midAngle: currentAngle + sliceAngle / 2,
    });
    currentAngle += sliceAngle;
  }
  return slices;
}
