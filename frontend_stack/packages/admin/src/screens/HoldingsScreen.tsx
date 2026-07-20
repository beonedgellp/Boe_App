import { useState, useMemo } from 'react';
import { Search, PieChart, Layers } from 'lucide-react';
import '../styles/desktop/admin.css';
import I from '../components/I.tsx';
import StatTile from '../components/StatTile.tsx';
import EmptyTableRow from '../components/EmptyTableRow.tsx';
import { fmtInt } from '../helpers/formatters.ts';

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
            <h2 className="adm-card-title">Holdings by fund</h2>
          </div>
          <div className="adm-card-actions">
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
                  <div className="adm-cell-main">{f.name}</div>
                  <div className="adm-cell-sub">{f.tagline || '—'}</div>
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
                  <div className="adm-detail-panel">
                    <h4 className="adm-detail-title">{selectedFund.name} — Holdings</h4>
                    {selectedFund.sectors && selectedFund.sectors.length > 0 && (
                      <div className="adm-detail-section">
                        <h5 className="adm-detail-section-title">Sectors</h5>
                        <div className="adm-detail-tags">
                          {selectedFund.sectors.map((s, i) => (
                            <span key={i} className="be-badge be-badge-neutral">{s.name}: {s.percentage}%</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedFund.investments && selectedFund.investments.length > 0 ? (
                      <table className="adm-table adm-table-sm">
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
                      <p className="adm-text-muted">No investment holdings recorded for this fund.</p>
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
