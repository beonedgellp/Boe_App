import { useState, useMemo, useEffect } from 'react';
import { Search, ArrowLeft, ArrowRight } from 'lucide-react';
import '../styles/desktop/admin.css';
import I from '../components/I.tsx';
import StatTile from '../components/StatTile.tsx';
import EmptyTableRow from '../components/EmptyTableRow.tsx';
import SkeletonTableRow from '../components/SkeletonTableRow.tsx';
import { apiRequest, listFromPayload } from '@beonedge/client/services/_util.ts';
import { fmtInt } from '../helpers/formatters.ts';
import { fmtMoney } from '@beonedge/shared/format.ts';
import './admin-screens-shared.css';

const TXN_TYPES = {
  sip: 'SIP',
  sip_installment: 'SIP',
  lumpsum: 'Lumpsum',
  one_time: 'Lumpsum',
};

const TXN_STATUS_BADGES = {
  submitted: <span className="be-badge be-badge-paused"><span className="be-badge-dot"/>Submitted</span>,
  payment_confirmed: <span className="be-badge be-badge-active"><span className="be-badge-dot"/>Confirmed</span>,
  awaiting_approval: <span className="be-badge be-badge-paused"><span className="be-badge-dot"/>Awaiting approval</span>,
  approved: <span className="be-badge be-badge-active"><span className="be-badge-dot"/>Approved</span>,
  payment_failed: <span className="be-badge be-badge-failed"><span className="be-badge-dot"/>Failed</span>,
  approval_rejected: <span className="be-badge be-badge-failed"><span className="be-badge-dot"/>Approval rejected</span>,
};

function TransactionsScreen({ funds = [] }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [fundFilter, setFundFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, limit: 25 });

  const fetchTransactions = async (nextPage = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(nextPage));
      params.set('limit', '25');
      if (fundFilter !== 'all') params.set('fundId', fundFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (searchQuery.trim()) params.set('q', searchQuery.trim());

      const result = await apiRequest(`/v1/admin/transactions?${params.toString()}`, { scope: 'admin' });
      const items = listFromPayload(result);
      setRows(items);
      setPagination({
        total: result?.total ?? items.length,
        limit: result?.limit ?? 25,
      });
      setPage(nextPage);
    } catch {
      setRows([]);
      setPagination({ total: 0, limit: 25 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions(1);
  }, [fundFilter, statusFilter, typeFilter]);

  useEffect(() => {
    const t = setTimeout(() => fetchTransactions(1), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const stats = useMemo(() => {
    const totalAmount = rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const confirmed = rows.filter((r) => r.status === 'payment_confirmed' || r.status === 'approved').length;
    const failed = rows.filter((r) => r.status === 'payment_failed' || r.status === 'approval_rejected').length;
    return { totalAmount, confirmed, failed };
  }, [rows]);

  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.limit));

  return (
    <div className="adm-screen">
      <div className="adm-stats">
        <StatTile label="Total transactions" value={fmtInt(pagination.total)} />
        <StatTile label="Total amount" value={`₹${fmtMoney(stats.totalAmount)}`} />
        <StatTile label="Confirmed" value={fmtInt(stats.confirmed)} />
        <StatTile label="Failed" value={fmtInt(stats.failed)} />
      </div>

      <div className="adm-card adm-table">
        <div className="adm-card-head">
          <div>
            <span className="be-eyebrow">Transactions</span>
            <h2 className="adm-card-title">All client transactions</h2>
          </div>
          <div className="adm-card-actions adm-card-actions--responsive">
            <div className="adm-search">
              <I icon={Search} size={14} />
              <input
                type="text"
                placeholder="Search user, fund, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select className="be-select be-select-sm" value={fundFilter} onChange={(e) => setFundFilter(e.target.value)}>
              <option value="all">All fund pools</option>
              {funds.map((f) => (
                <option key={f.id} value={f.id}>{f.name || f.id}</option>
              ))}
            </select>
            <select className="be-select be-select-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All statuses</option>
              <option value="submitted">Submitted</option>
              <option value="awaiting_approval">Awaiting approval</option>
              <option value="payment_confirmed">Confirmed</option>
              <option value="approved">Approved</option>
              <option value="payment_failed">Failed</option>
              <option value="approval_rejected">Approval rejected</option>
            </select>
            <select className="be-select be-select-sm" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">All types</option>
              <option value="sip">SIP</option>
              <option value="lumpsum">Lumpsum</option>
            </select>
          </div>
        </div>

        <table>
          <thead><tr>
            <th>ID</th><th>User</th><th>Fund</th><th>Type</th><th>Amount</th><th>Status</th><th>Date</th>
          </tr></thead>
          <tbody>
            {loading && (
              <>
                <SkeletonTableRow colSpan={7} />
                <SkeletonTableRow colSpan={7} />
                <SkeletonTableRow colSpan={7} />
              </>
            )}
            {!loading && rows.length === 0 && (
              <EmptyTableRow colSpan={7}>No transactions found.</EmptyTableRow>
            )}
            {!loading && rows.map((r) => (
              <tr key={r.id}>
                <td><code className="adm-code">{String(r.id).slice(0, 8)}...</code></td>
                <td>
                  <div>{r.userName || '—'}</div>
                  {r.userEmail && <div className="adm-cell-meta">{r.userEmail}</div>}
                </td>
                <td>{r.fundName || '—'}</td>
                <td>{TXN_TYPES[r.type] || r.type || '—'}</td>
                <td className="be-money">₹{fmtMoney(r.amount)}</td>
                <td>{TXN_STATUS_BADGES[r.status] || r.status || '—'}</td>
                <td className="be-num adm-cell-meta">{String(r.createdAt || '').slice(0, 19).replace('T', ' ')}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="adm-pagination">
            <button className="be-btn be-btn-ghost be-btn-sm" disabled={page <= 1} onClick={() => fetchTransactions(page - 1)}>
              <I icon={ArrowLeft} size={14} /> Previous
            </button>
            <span className="adm-page-info">Page {page} of {totalPages}</span>
            <button className="be-btn be-btn-ghost be-btn-sm" disabled={page >= totalPages} onClick={() => fetchTransactions(page + 1)}>
              Next <I icon={ArrowRight} size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default TransactionsScreen;
