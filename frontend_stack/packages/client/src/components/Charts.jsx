// Reusable chart helpers (inline SVG paths from {x,y} series).
// Pure geometry lives in ./chartMath.js (unit-tested); this file owns rendering.
import React from 'react';
import {
  lineChartGeometry,
  buildLinePath,
  computeDonutSlices,
  describeDonutSlice as describeDonutSliceMath,
} from './chartMath.js';

// Donut ring for allocations.
export function AllocationRing({ data, size = 92, stroke = 12, gap = 2 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = data.reduce((s, d) => s + d.pct, 0) || 100;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        {data.map((d, i) => {
          const len = (d.pct / total) * c - gap;
          const dasharray = `${Math.max(0, len)} ${c}`;
          const seg = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth={stroke}
              strokeDasharray={dasharray}
              strokeDashoffset={-offset}
            />
          );
          offset += (d.pct / total) * c;
          return seg;
        })}
      </g>
    </svg>
  );
}

export function PieChart({ data, size = 200 }) {
  // data: [{ label, percentage, color }]
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 4;
  const innerR = size / 3;
  const total = data.reduce((s, d) => s + (d.percentage || 0), 0) || 100;
  const gap = 1; // degrees
  let currentAngle = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      {data.map((d, i) => {
        const sliceAngle = (d.percentage / total) * 360;
        const startAngle = currentAngle + gap / 2;
        const endAngle = currentAngle + sliceAngle - gap / 2;
        const path = describeDonutSliceMath(cx, cy, outerR, innerR, startAngle, endAngle);
        currentAngle += sliceAngle;
        return <path key={i} d={path} fill={d.color} stroke="none" />;
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// 3D Pie Chart (elliptical perspective with depth)
// ---------------------------------------------------------------------------

function polarToCartesianElliptical(cx, cy, rx, ry, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180.0;
  return { x: cx + rx * Math.cos(rad), y: cy + ry * Math.sin(rad) };
}

function describeEllipticalArc(cx, cy, rx, ry, startAngle, endAngle) {
  const start = polarToCartesianElliptical(cx, cy, rx, ry, endAngle);
  const end = polarToCartesianElliptical(cx, cy, rx, ry, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return [
    'M', start.x, start.y,
    'A', rx, ry, 0, largeArcFlag, 0, end.x, end.y,
  ].join(' ');
}

function describeEllipticalDonutSlice(cx, cy, outerRx, outerRy, innerRx, innerRy, startAngle, endAngle) {
  const startOuter = polarToCartesianElliptical(cx, cy, outerRx, outerRy, endAngle);
  const endOuter = polarToCartesianElliptical(cx, cy, outerRx, outerRy, startAngle);
  const startInner = polarToCartesianElliptical(cx, cy, innerRx, innerRy, endAngle);
  const endInner = polarToCartesianElliptical(cx, cy, innerRx, innerRy, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return [
    'M', startOuter.x, startOuter.y,
    'A', outerRx, outerRy, 0, largeArcFlag, 0, endOuter.x, endOuter.y,
    'L', endInner.x, endInner.y,
    'A', innerRx, innerRy, 0, largeArcFlag, 1, startInner.x, startInner.y,
    'Z',
  ].join(' ');
}

function createSideFacePath(cx, cy, rx, ry, innerRx, innerRy, startAngle, endAngle, depth) {
  // We draw the outer edge and inner edge vertical walls.
  // For a 3D pie, we only need side faces for the outer arc (the inner hole is open).
  const startOuterTop = polarToCartesianElliptical(cx, cy, rx, ry, endAngle);
  const endOuterTop = polarToCartesianElliptical(cx, cy, rx, ry, startAngle);
  const startOuterBot = { x: startOuterTop.x, y: startOuterTop.y + depth };
  const endOuterBot = { x: endOuterTop.x, y: endOuterTop.y + depth };

  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  return [
    'M', startOuterTop.x, startOuterTop.y,
    'A', rx, ry, 0, largeArcFlag, 0, endOuterTop.x, endOuterTop.y,
    'L', endOuterBot.x, endOuterBot.y,
    'A', rx, ry, 0, largeArcFlag, 1, startOuterBot.x, startOuterBot.y,
    'Z',
  ].join(' ');
}

export function PieChart3D({ data, size = 200, depth = 16 }) {
  if (!data || data.length === 0) {
    return (
      <svg width={size} height={size + depth} viewBox={`0 0 ${size} ${size + depth}`} aria-hidden="true">
        <text x={size / 2} y={(size + depth) / 2} textAnchor="middle" fontSize="12" fill="var(--be-slate)">
          No data
        </text>
      </svg>
    );
  }

  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 8;
  const innerR = outerR * 0.45;
  const ryRatio = 0.6;
  const outerRx = outerR;
  const outerRy = outerR * ryRatio;
  const innerRx = innerR;
  const innerRy = innerR * ryRatio;
  const total = data.reduce((s, d) => s + (d.percentage || 0), 0) || 100;
  const gap = 1; // degrees
  let currentAngle = 0;

  // We need to render back-to-front for proper occlusion.
  // In a 3D pie viewed from above, slices whose mid-angle is in the front half
  // (roughly 0-180 degrees) should be drawn AFTER slices in the back half.
  const slices = data.map((d, i) => {
    const sliceAngle = (d.percentage / total) * 360;
    const startAngle = currentAngle + gap / 2;
    const endAngle = currentAngle + sliceAngle - gap / 2;
    const midAngle = (startAngle + endAngle) / 2;
    currentAngle += sliceAngle;
    return {
      index: i,
      data: d,
      startAngle,
      endAngle,
      midAngle,
      isFront: midAngle >= 0 && midAngle <= 180,
    };
  });

  // Sort: back slices first, then front slices
  const sortedSlices = [...slices].sort((a, b) => (a.isFront === b.isFront ? 0 : a.isFront ? 1 : -1));

  const vbW = size;
  const vbH = size + depth;

  return (
    <svg width={size} height={size + depth} viewBox={`0 0 ${vbW} ${vbH}`} aria-hidden="true">
      <defs>
        <filter id="darken" x="-20%" y="-20%" width="140%" height="140%">
          <feComponentTransfer>
            <feFuncR type="linear" slope="0.7" />
            <feFuncG type="linear" slope="0.7" />
            <feFuncB type="linear" slope="0.7" />
          </feComponentTransfer>
        </filter>
        <filter id="dropShadow" x="-20%" y="-20%" width="150%" height="150%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="4" />
          <feOffset dx="0" dy="4" result="offsetblur" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.18" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Drop shadow ellipse under the whole chart */}
      <ellipse
        cx={cx}
        cy={cy + depth + 4}
        rx={outerRx}
        ry={outerRy}
        fill="rgba(0,0,0,0.10)"
        filter="url(#dropShadow)"
      />

      {/* Back side faces (only for back half slices) */}
      <g filter="url(#darken)">
        {sortedSlices
          .filter((s) => !s.isFront)
          .map((s) => (
            <path
              key={`side-${s.index}`}
              d={createSideFacePath(cx, cy, outerRx, outerRy, innerRx, innerRy, s.startAngle, s.endAngle, depth)}
              fill={s.data.color}
              stroke="none"
            />
          ))}
      </g>

      {/* Front side faces (only for front half slices) */}
      <g filter="url(#darken)">
        {sortedSlices
          .filter((s) => s.isFront)
          .map((s) => (
            <path
              key={`side-${s.index}`}
              d={createSideFacePath(cx, cy, outerRx, outerRy, innerRx, innerRy, s.startAngle, s.endAngle, depth)}
              fill={s.data.color}
              stroke="none"
            />
          ))}
      </g>

      {/* Top faces */}
      {sortedSlices.map((s) => {
        const d = describeEllipticalDonutSlice(
          cx,
          cy,
          outerRx,
          outerRy,
          innerRx,
          innerRy,
          s.startAngle,
          s.endAngle
        );
        return <path key={`top-${s.index}`} d={d} fill={s.data.color} stroke="none" />;
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Fund vs benchmark comparison line chart (two overlaid trend lines, no axes)
// ---------------------------------------------------------------------------

// series: [{ date, fund, nifty }]. Renders nothing below two points so the
// caller can show a "performance pending" state instead of a misleading line.
export function LineComparisonChart({
  series,
  width = 320,
  height = 96,
  padding = 6,
  fundColor = 'var(--be-green)',
  benchmarkColor = 'var(--be-slate)',
  strokeWidth = 2,
  showLegend = false,
  legendFundLabel = 'Fund',
  legendBenchmarkLabel = 'Nifty',
  className = '',
}) {
  const rows = Array.isArray(series) ? series : [];
  if (rows.length < 2) return null;

  const geo = lineChartGeometry(rows, { width, height, padding });
  const fundPath = buildLinePath(geo.fund);
  const benchmarkPath = buildLinePath(geo.nifty);

  return (
    <div className={`apk-line-chart ${className}`.trim()}>
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Fund performance compared with benchmark"
      >
        <path d={benchmarkPath} fill="none" stroke={benchmarkColor} strokeWidth={strokeWidth}
          strokeLinejoin="round" strokeLinecap="round" opacity="0.55" />
        <path d={fundPath} fill="none" stroke={fundColor} strokeWidth={strokeWidth}
          strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      {showLegend && (
        <div className="apk-line-chart-legend">
          <span className="apk-line-chart-legend-item">
            <span className="apk-line-chart-swatch" style={{ background: fundColor }} />
            {legendFundLabel}
          </span>
          <span className="apk-line-chart-legend-item">
            <span className="apk-line-chart-swatch" style={{ background: benchmarkColor }} />
            {legendBenchmarkLabel}
          </span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Flat donut chart with an optional center label (asset split / sector mix)
// ---------------------------------------------------------------------------

// data: [{ label, percentage, color }]. Renders nothing when empty so the
// caller can hide the whole section.
export function DonutChart({
  data,
  size = 180,
  thickness = 26,
  gap = 1.2,
  centerLabel = '',
  centerSubLabel = '',
  className = '',
  ariaLabel = 'Allocation breakdown',
}) {
  const rows = Array.isArray(data) ? data : [];
  const outerR = size / 2 - 2;
  const innerR = outerR - thickness;
  const slices = computeDonutSlices(rows, { cx: size / 2, cy: size / 2, outerR, innerR, gap });
  if (slices.length === 0) return null;

  return (
    <svg
      className={`apk-donut ${className}`.trim()}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={ariaLabel}
    >
      {slices.map((s, i) => (
        <path key={i} d={s.path} fill={s.color} stroke="none" />
      ))}
      {centerLabel && (
        <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
          className="apk-donut-center" fontSize={size * 0.11} fontWeight="600">
          {centerLabel}
        </text>
      )}
      {centerSubLabel && (
        <text x={size / 2} y={size / 2 + size * 0.11} textAnchor="middle" dominantBaseline="central"
          className="apk-donut-subcenter" fontSize={size * 0.06}>
          {centerSubLabel}
        </text>
      )}
    </svg>
  );
}
