import { useState, useMemo } from 'react';
import { Search, PieChart, Layers } from 'lucide-react';
import '../styles/desktop/admin.css';
import '../styles/mobile/admin.css';
import I from '../components/I.jsx';
import StatTile from '../components/StatTile.jsx';
import EmptyTableRow from '../components/EmptyTableRow.jsx';
import { fmtInt } from '../helpers/formatters.js';

function HoldingsScreen({ funds = [], loading = false }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFund, setSelectedFund] = useState(null);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return funds.filter((f) => {
      return !q || String(f.name || '').toLowerCase().includes(q);
    });
  }, [funds, searchQuery]);

  const totalAum = useMemo(() =>
    funds.reduce((sum, f) => sum + (Number(f.currentValue) || 0), 0),
    [funds]
  );

  return (
    <div className="adm-screen">
      <div className="adm-stats">
        <StatTile label="Funds" value={fmtInt(funds.length)} />
        <StatTile label="Total AUM" value={`₹${fmtInt(totalAum)}`} />
        <StatTile label="Visible to clients" value={fmtInt(funds.filter((f) => ['published','active','paused','closed'].includes(f.lifecycleStage)).length)} />
      </div>

      <div className="adm-card">
        <div className="adm-card-head">
          <div>
            <span className="be-eyebrow">Portfolio</span>
            <h3 className="adm-card-title">Holdings by fund</h3>
          </div>
          <div className="adm-card-actions" style={{ gap: 8, display: 'flex', alignItems: 'center' }}>
            <div className="adm-search">
              <I icon={Search} size={14} />
              <input
                type="text"
                placeholder="Search funds..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        <table>
          <thead><tr>
            <th>Fund</th><th>Stage</th><th>Sectors</th><th>Holdings</th><th>AUM</th><th></th>
          </tr></thead>
          <tbody>
            {filtered.length === 0 && (
              <EmptyTableRow colSpan={6}>No funds available.</EmptyTableRow>
            )}
            {filtered.map((f) => (
              <tr key={f.id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{f.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--be-slate)' }}>{f.tagline || '—'}</div>
                </td>
                <td>
                  <span className={`be-badge be-badge-${f.lifecycleStage === 'active' ? 'active' : f.lifecycleStage === 'paused' ? 'paused' : 'neutral'}`}>
                    {f.lifecycleStage}
                  </span>
                </td>
                <td>{(f.sectors || []).length}</td>
                <td>{(f.investments || []).length}</td>
                <td className="be-money">₹{fmtInt(f.currentValue)}</td>
                <td className="adm-cell-actions">
                  <button className="be-btn be-btn-ghost be-btn-sm" onClick={() => setSelectedFund(selectedFund?.id === f.id ? null : f)}>
                    <I icon={PieChart} size={14} /> View
                  </button>
                </td>
              </tr>
            ))}
            {selectedFund && filtered.find((f) => f.id === selectedFund.id) && (
              <tr className="adm-detail-row">
                <td colSpan={6}>
                  <div style={{ padding: 16, background: 'var(--be-surface)', borderRadius: 8 }}>
                    <h4 style={{ margin: '0 0 12px' }}>{selectedFund.name} — Holdings</h4>
                    {selectedFund.sectors && selectedFund.sectors.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <h5 style={{ margin: '0 0 8px', fontSize: 12, textTransform: 'uppercase', color: 'var(--be-slate)' }}>Sectors</h5>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {selectedFund.sectors.map((s, i) => (
                            <span key={i} className="be-badge be-badge-neutral">{s.name}: {s.percentage}%</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedFund.investments && selectedFund.investments.length > 0 ? (
                      <table className="adm-table" style={{ fontSize: 12 }}>
                        <thead><tr><th>Company</th><th>Sector</th><th>Amount</th></tr></thead>
                        <tbody>
                          {selectedFund.investments.map((inv) => (
                            <tr key={inv.id}>
                              <td>{inv.companyName || inv.name || '—'}</td>
                              <td>{inv.sectorId || '—'}</td>
                              <td className="be-money">₹{fmtInt(inv.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p style={{ color: 'var(--be-slate)' }}>No investment holdings recorded for this fund.</p>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default HoldingsScreen;
