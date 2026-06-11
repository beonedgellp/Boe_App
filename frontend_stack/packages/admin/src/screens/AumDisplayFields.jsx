import { useMemo } from 'react';
import {
  LineChart, PieChart, Gauge, Plus, Trash2, ArrowDownUp, AlertTriangle, Star, Calendar,
} from 'lucide-react';
import I from '../components/I.jsx';

// Admin editor for the Session 4 fund display fields (Groww-style profile):
// identity extras, performance vs Nifty, asset split, advanced ratios.
// Operates immutably on the parent AumScreen `form` via `setForm`.

const PERIOD_KEYS = ['1M', '6M', '1Y', '3Y', '5Y', 'ALL'];
const RATIO_FIELDS = [
  { key: 'pe', label: 'P/E' },
  { key: 'pb', label: 'P/B' },
  { key: 'beta', label: 'Beta' },
  { key: 'alpha', label: 'Alpha' },
  { key: 'sharpe', label: 'Sharpe' },
  { key: 'sortino', label: 'Sortino' },
];

function num(value) {
  return value === '' || value === null || value === undefined ? '' : Number(value);
}

export default function AumDisplayFields({ form, setForm }) {
  const setField = (key, value) => setForm((s) => ({ ...s, [key]: value }));
  const setGroup = (group, key, value) =>
    setForm((s) => ({ ...s, [group]: { ...(s[group] || {}), [key]: value } }));

  const series = Array.isArray(form.performanceSeries) ? form.performanceSeries : [];
  const periods = Array.isArray(form.performancePeriods) ? form.performancePeriods : [];
  const assets = Array.isArray(form.assetAllocation) ? form.assetAllocation : [];
  const ratios = form.advancedRatios || {};
  const nav = form.nav || {};
  const rating = form.rating || {};

  const assetTotal = useMemo(
    () => assets.reduce((sum, a) => sum + (Number(a.percentage) || 0), 0),
    [assets],
  );

  /* ---- performance period rows (upsert by fixed key) ---- */
  const periodFor = (key) => periods.find((p) => p.key === key) || { key, label: key };
  function setPeriod(key, field, value) {
    setForm((s) => {
      const rows = Array.isArray(s.performancePeriods) ? [...s.performancePeriods] : [];
      const idx = rows.findIndex((p) => p.key === key);
      const base = idx >= 0 ? rows[idx] : { key, label: key };
      const next = { ...base, [field]: field === 'annualized' ? value : num(value) };
      if (idx >= 0) rows[idx] = next; else rows.push(next);
      return { ...s, performancePeriods: rows };
    });
  }

  /* ---- performance series rows ---- */
  function addSeriesRow() {
    setForm((s) => ({ ...s, performanceSeries: [...(s.performanceSeries || []), { date: '', fund: 100, nifty: 100 }] }));
  }
  function setSeriesRow(index, field, value) {
    setForm((s) => {
      const rows = [...(s.performanceSeries || [])];
      rows[index] = { ...rows[index], [field]: field === 'date' ? value : num(value) };
      return { ...s, performanceSeries: rows };
    });
  }
  function removeSeriesRow(index) {
    setForm((s) => ({ ...s, performanceSeries: (s.performanceSeries || []).filter((_, i) => i !== index) }));
  }
  function sortSeries() {
    setForm((s) => ({
      ...s,
      performanceSeries: [...(s.performanceSeries || [])].sort((a, b) => new Date(a.date) - new Date(b.date)),
    }));
  }

  /* ---- asset split rows ---- */
  function addAsset() {
    setForm((s) => ({
      ...s,
      assetAllocation: [...(s.assetAllocation || []), { id: `asset_${Date.now()}`, label: '', percentage: 0, color: 'var(--be-green)' }],
    }));
  }
  function setAsset(index, field, value) {
    setForm((s) => {
      const rows = [...(s.assetAllocation || [])];
      rows[index] = { ...rows[index], [field]: field === 'percentage' ? num(value) : value };
      return { ...s, assetAllocation: rows };
    });
  }
  function removeAsset(index) {
    setForm((s) => ({ ...s, assetAllocation: (s.assetAllocation || []).filter((_, i) => i !== index) }));
  }

  return (
    <>
      {/* Display profile (identity extras) */}
      <div className="adm-fund-editor-section">
        <div className="adm-fund-editor-section-title"><I icon={Star} size={16} /> Display Profile</div>
        <div className="adm-form-grid">
          <label className="adm-field"><span>Category</span>
            <input value={form.category || ''} onChange={(e) => setField('category', e.target.value)} placeholder="e.g. Equity" />
          </label>
          <label className="adm-field"><span>Sub-category</span>
            <input value={form.subCategory || ''} onChange={(e) => setField('subCategory', e.target.value)} placeholder="e.g. Flexi Cap" />
          </label>
          <label className="adm-field adm-field-wide"><span>Risk display text</span>
            <input value={form.riskText || ''} onChange={(e) => setField('riskText', e.target.value)} placeholder="e.g. Very High Risk" />
          </label>
          <label className="adm-field"><span>NAV value (₹)</span>
            <input type="number" step="0.01" value={nav.value ?? ''} onChange={(e) => setGroup('nav', 'value', num(e.target.value))} />
          </label>
          <label className="adm-field"><span>NAV as of</span>
            <input type="date" value={nav.asOf || ''} onChange={(e) => setGroup('nav', 'asOf', e.target.value)} />
          </label>
          <label className="adm-field"><span>Rating (out of scale)</span>
            <input type="number" min="0" step="0.1" value={rating.value ?? ''} onChange={(e) => setGroup('rating', 'value', num(e.target.value))} />
          </label>
          <label className="adm-field"><span>Rating scale</span>
            <input type="number" min="1" value={rating.scale ?? 5} onChange={(e) => setGroup('rating', 'scale', num(e.target.value))} />
          </label>
          <label className="adm-field"><span><I icon={Calendar} size={12} /> Holdings as of</span>
            <input type="date" value={form.holdingsAsOf || ''} onChange={(e) => setField('holdingsAsOf', e.target.value)} />
          </label>
        </div>
      </div>

      {/* Performance vs Nifty */}
      <div className="adm-fund-editor-section">
        <div className="adm-fund-editor-section-title"><I icon={LineChart} size={16} /> Performance vs Nifty</div>
        <p className="adm-cell-meta" style={{ marginTop: 0 }}>Admin-published, indicative figures. Returns are stored as percentages.</p>

        <table className="adm-mini-table">
          <thead><tr><th>Period</th><th>Fund %</th><th>Nifty %</th><th>Annualised</th></tr></thead>
          <tbody>
            {PERIOD_KEYS.map((key) => {
              const p = periodFor(key);
              return (
                <tr key={key}>
                  <td><strong>{key}</strong></td>
                  <td><input type="number" step="0.01" value={p.fundReturnPct ?? ''} onChange={(e) => setPeriod(key, 'fundReturnPct', e.target.value)} /></td>
                  <td><input type="number" step="0.01" value={p.niftyReturnPct ?? ''} onChange={(e) => setPeriod(key, 'niftyReturnPct', e.target.value)} /></td>
                  <td style={{ textAlign: 'center' }}><input type="checkbox" checked={p.annualized === true} onChange={(e) => setPeriod(key, 'annualized', e.target.checked)} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '14px 0 6px' }}>
          <span className="be-eyebrow" style={{ fontSize: 10 }}>Index series (baseline 100)</span>
          {series.length > 0 && series.length < 2 && (
            <span className="be-eyebrow adm-tone-red" style={{ fontSize: 10 }}><I icon={AlertTriangle} size={11} /> Need ≥2 points to draw the chart</span>
          )}
        </div>
        <div className="adm-editor-list">
          {series.map((row, index) => (
            <div className="adm-series-row" key={index}>
              <input type="date" value={row.date || ''} onChange={(e) => setSeriesRow(index, 'date', e.target.value)} />
              <input type="number" step="0.01" value={row.fund ?? ''} onChange={(e) => setSeriesRow(index, 'fund', e.target.value)} placeholder="Fund" />
              <input type="number" step="0.01" value={row.nifty ?? ''} onChange={(e) => setSeriesRow(index, 'nifty', e.target.value)} placeholder="Nifty" />
              <button type="button" className="adm-icon-btn" onClick={() => removeSeriesRow(index)} aria-label="Remove point"><I icon={Trash2} size={14} /></button>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button type="button" className="be-btn be-btn-secondary be-btn-sm" onClick={addSeriesRow}><I icon={Plus} size={14} /> Add point</button>
          <button type="button" className="be-btn be-btn-ghost be-btn-sm" onClick={sortSeries} disabled={series.length < 2}><I icon={ArrowDownUp} size={14} /> Sort by date</button>
        </div>
      </div>

      {/* Asset split */}
      <div className="adm-fund-editor-section">
        <div className="adm-fund-editor-section-title" style={{ justifyContent: 'space-between' }}>
          <span><I icon={PieChart} size={16} /> Asset Split (Equity / Debt / Cash)</span>
          <span className={`be-eyebrow ${Math.abs(assetTotal - 100) < 0.1 ? 'adm-tone-green' : 'adm-tone-red'}`}>Total: {assetTotal.toFixed(2)}%</span>
        </div>
        <div className="adm-editor-list">
          {assets.map((a, index) => (
            <div className="adm-sector-row" key={a.id || index}>
              <input value={a.label || ''} onChange={(e) => setAsset(index, 'label', e.target.value)} placeholder="Label (e.g. Equity)" />
              <input type="number" min="0" max="100" step="0.01" value={a.percentage ?? ''} onChange={(e) => setAsset(index, 'percentage', e.target.value)} placeholder="%" />
              <input value={a.color || ''} onChange={(e) => setAsset(index, 'color', e.target.value)} placeholder="#hex" />
              <button type="button" className="adm-icon-btn" onClick={() => removeAsset(index)} aria-label="Remove asset"><I icon={Trash2} size={14} /></button>
            </div>
          ))}
        </div>
        <button type="button" className="be-btn be-btn-secondary be-btn-sm" onClick={addAsset} style={{ marginTop: 8 }}><I icon={Plus} size={14} /> Add asset class</button>
      </div>

      {/* Advanced ratios */}
      <div className="adm-fund-editor-section">
        <div className="adm-fund-editor-section-title"><I icon={Gauge} size={16} /> Advanced Ratios</div>
        <p className="adm-cell-meta" style={{ marginTop: 0 }}>Display metrics only — never used in order execution. Leave blank to hide a metric.</p>
        <div className="adm-form-grid">
          {RATIO_FIELDS.map((r) => (
            <label className="adm-field" key={r.key}><span>{r.label}</span>
              <input type="number" step="0.01" value={ratios[r.key] ?? ''} onChange={(e) => setGroup('advancedRatios', r.key, num(e.target.value))} />
            </label>
          ))}
        </div>
      </div>
    </>
  );
}
