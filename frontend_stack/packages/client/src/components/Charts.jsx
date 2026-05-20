// Reusable chart helpers (inline SVG paths from {x,y} series).
import React from 'react';

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

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180.0;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeDonutSlice(cx, cy, outerR, innerR, startAngle, endAngle) {
  const startOuter = polarToCartesian(cx, cy, outerR, endAngle);
  const endOuter = polarToCartesian(cx, cy, outerR, startAngle);
  const startInner = polarToCartesian(cx, cy, innerR, endAngle);
  const endInner = polarToCartesian(cx, cy, innerR, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return [
    'M', startOuter.x, startOuter.y,
    'A', outerR, outerR, 0, largeArcFlag, 0, endOuter.x, endOuter.y,
    'L', endInner.x, endInner.y,
    'A', innerR, innerR, 0, largeArcFlag, 1, startInner.x, startInner.y,
    'Z',
  ].join(' ');
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
        const path = describeDonutSlice(cx, cy, outerR, innerR, startAngle, endAngle);
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
