import { useEffect, useState } from 'react';
import { Search, ChevronLeft, ChevronRight, User, Mail, Phone, CheckCircle2, Clock } from 'lucide-react';
import { apiRequest } from '../../client/services/_util.js';
import I from '../components/I.jsx';
import EmptyTableRow from '../components/EmptyTableRow.jsx';
import SkeletonTableRow from '../components/SkeletonTableRow.jsx';
import { initials, displayRole, fmtInt } from '../helpers/formatters.js';

export default function UserDetailsListScreen({ onUserDetail }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [sortKey, setSortKey] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');

  async function loadUsers() {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('status', 'approved');
      if (q.trim()) params.set('q', q.trim());
      params.set('page', String(page));
      params.set('limit', String(limit));
      const payload = await apiRequest(`/v1/admin/users?${params.toString()}`, { scope: 'admin' });
      const items = payload?.items || payload?.data?.items || [];
      const payloadTotal = payload?.total ?? payload?.data?.total ?? items.length;
      setUsers(items);
      setTotal(payloadTotal);
    } catch (err) {
      setError(err?.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [q, page, limit]);

  const sortedUsers = [...users].sort((a, b) => {
    const aVal = a[sortKey] || '';
    const bVal = b[sortKey] || '';
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="adm-screen">
      <div className="adm-card adm-table">
        <div className="adm-card-head">
          <div>
            <span className="be-eyebrow">Client Directory</span>
            <h3 className="adm-card-title">Approved Users</h3>
          </div>
          <div className="adm-card-actions">
            <span className="adm-cell-meta">{fmtInt(total)} total</span>
          </div>
        </div>

        <div className="adm-toolbar">
          <div className="adm-search" style={{ flex: 1 }}>
            <I icon={Search} size={14} />
            <input
              type="text"
              placeholder="Search by name, email or phone..."
              value={q}
              onChange={(e) => { setPage(1); setQ(e.target.value); }}
            />
          </div>
          <div className="adm-filter">
            <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}>
              <option value={10}>10 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>
        </div>

        {error && <div className="adm-load-note">{error}</div>}

        <div className="adm-table-scroll">
          <table>
            <thead>
              <tr>
                <th className="adm-col-user" onClick={() => toggleSort('name')} style={{ cursor: 'pointer' }}>
                  User {sortKey === 'name' && (sortDir === 'asc' ? '▲' : '▼')}
                </th>
                <th className="adm-col-date" onClick={() => toggleSort('createdAt')} style={{ cursor: 'pointer' }}>
                  Signed up {sortKey === 'createdAt' && (sortDir === 'asc' ? '▲' : '▼')}
                </th>
                <th className="adm-col-date" onClick={() => toggleSort('approvedAt')} style={{ cursor: 'pointer' }}>
                  Approved {sortKey === 'approvedAt' && (sortDir === 'asc' ? '▲' : '▼')}
                </th>
                <th className="adm-col-status">Status</th>
                <th className="adm-col-role">Role</th>
                <th className="adm-col-actions"></th>
              </tr>
            </thead>
            <tbody>
              {loading && sortedUsers.length === 0 && (
                <>
                  <SkeletonTableRow />
                  <SkeletonTableRow />
                  <SkeletonTableRow />
                  <SkeletonTableRow />
                  <SkeletonTableRow />
                </>
              )}
              {!loading && sortedUsers.length === 0 && (
                <EmptyTableRow colSpan={6}>
                  No approved users yet. Approved clients will appear here automatically.
                </EmptyTableRow>
              )}
              {sortedUsers.map((r) => (
                <tr key={r.id || r.email}>
                  <td className="adm-col-user">
                    <div className="adm-user">
                      <div className="adm-avatar adm-avatar-sm">{initials(r.name, 'CL')}</div>
                      <div className="adm-user-info">
                        <div className="adm-user-name">{r.name}</div>
                        <div className="adm-cell-meta">{r.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="adm-col-date">
                    <span className="adm-cell-meta">{r.createdAt || '—'}</span>
                  </td>
                  <td className="adm-col-date">
                    <span className="adm-cell-meta">{r.approvedAt || '—'}</span>
                  </td>
                  <td className="adm-col-status">
                    <span className="be-badge be-badge-green"><CheckCircle2 size={12} /> Approved</span>
                  </td>
                  <td className="adm-col-role">{displayRole(r)}</td>
                  <td className="adm-col-actions">
                    <button className="be-btn be-btn-ghost be-btn-sm" onClick={() => onUserDetail?.(r)}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="adm-toolbar" style={{ justifyContent: 'center', gap: 8, paddingTop: 12, borderTop: '1px solid var(--be-border)' }}>
            <button className="be-btn be-btn-secondary be-btn-sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              <I icon={ChevronLeft} size={14} /> Prev
            </button>
            <span className="adm-cell-meta">Page {page} of {totalPages}</span>
            <button className="be-btn be-btn-secondary be-btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              Next <I icon={ChevronRight} size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
