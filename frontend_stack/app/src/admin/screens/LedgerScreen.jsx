import { useState, useMemo } from 'react';
import { Search, BookOpen, Filter } from 'lucide-react';
import '../styles/admin.css';
import I from '../components/I.jsx';
import StatTile from '../components/StatTile.jsx';
import EmptyTableRow from '../components/EmptyTableRow.jsx';
import { fmtInt } from '../helpers/formatters.js';

function LedgerScreen({ rows = [], loading = false }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentIdFilter, setPaymentIdFilter] = useState('all');

  const paymentIds = useMemo(() => {
    const set = new Set(rows.map((r) => r.paymentId).filter(Boolean));
    return ['all', ...Array.from(set).sort()];
  }, [rows]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesSearch = !q ||
        String(r.paymentId || '').toLowerCase().includes(q) ||
        String(r.reason || '').toLowerCase().includes(q) ||
        String(r.previousStatus || '').toLowerCase().includes(q);
      const matchesPayment = paymentIdFilter === 'all' || r.paymentId === paymentIdFilter;
      return matchesSearch && matchesPayment;
    });
  }, [rows, searchQuery, paymentIdFilter]);

  const totalAmount = useMemo(() =>
    filtered.reduce((sum, r) => sum + (Number(r.amount) || 0), 0),
    [filtered]
  );

  return (
    <div className="adm-screen">
      <div className="adm-stats">
        <StatTile label="Total entries" value={fmtInt(rows.length)} />
        <StatTile label="Filtered amount" value={`₹${fmtInt(totalAmount)}`} />
        <StatTile label="Unique payments" value={fmtInt(paymentIds.length - 1)} />
      </div>

      <div className="adm-card">
        <div className="adm-card-head">
          <div>
            <span className="be-eyebrow">Reconciliation</span>
            <h3 className="adm-card-title">Ledger</h3>
          </div>
          <div className="adm-card-actions" style={{ gap: 8, display: 'flex', alignItems: 'center' }}>
            <div className="adm-search">
              <I icon={Search} size={14} />
              <input
                type="text"
                placeholder="Search payment ID, reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select className="be-select be-select-sm" value={paymentIdFilter} onChange={(e) => setPaymentIdFilter(e.target.value)}>
              {paymentIds.map((pid) => <option key={pid} value={pid}>{pid === 'all' ? 'All payments' : String(pid).slice(0, 16) + '...'}</option>)}
            </select>
          </div>
        </div>

        <table>
          <thead><tr>
            <th>ID</th><th>Payment</th><th>Amount</th><th>Previous</th><th>Reconciled</th><th>Reason</th><th>Time</th>
          </tr></thead>
          <tbody>
            {filtered.length === 0 && (
              <EmptyTableRow colSpan={7}>No ledger entries available.</EmptyTableRow>
            )}
            {filtered.map((r) => (
              <tr key={r.id}>
                <td><code className="adm-code">{String(r.id).slice(0, 8)}...</code></td>
                <td><code className="adm-code">{String(r.paymentId).slice(0, 12)}...</code></td>
                <td className="be-money">₹{fmtInt(r.amount)}</td>
                <td>{r.previousStatus || '—'}</td>
                <td>{r.reconciledStatus || '—'}</td>
                <td>{r.reason || '—'}</td>
                <td className="be-num adm-cell-meta">{String(r.createdAt || '').slice(0, 19).replace('T', ' ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default LedgerScreen;
