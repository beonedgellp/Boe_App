import { useState, useMemo } from 'react';
import {
  Search, Filter, History, User, FileText, ChevronDown, ChevronUp,
} from 'lucide-react';
import '../styles/desktop/admin.css';
import I from '../components/I.jsx';
import StatTile from '../components/StatTile.jsx';
import EmptyTableRow from '../components/EmptyTableRow.jsx';
import { fmtInt } from '../helpers/formatters.js';

function AuditLogScreen({ rows = [], loading = false }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  const actions = useMemo(() => {
    const set = new Set(rows.map((r) => r.action).filter(Boolean));
    return ['all', ...Array.from(set).sort()];
  }, [rows]);

  const entityTypes = useMemo(() => {
    const set = new Set(rows.map((r) => r.entityType).filter(Boolean));
    return ['all', ...Array.from(set).sort()];
  }, [rows]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesSearch = !q ||
        String(r.action || '').toLowerCase().includes(q) ||
        String(r.entityType || '').toLowerCase().includes(q) ||
        String(r.reason || '').toLowerCase().includes(q) ||
        String(r.adminId || '').toLowerCase().includes(q);
      const matchesAction = actionFilter === 'all' || r.action === actionFilter;
      const matchesEntity = entityFilter === 'all' || r.entityType === entityFilter;
      return matchesSearch && matchesAction && matchesEntity;
    });
  }, [rows, searchQuery, actionFilter, entityFilter]);

  const groupedByDate = useMemo(() => {
    const map = new Map();
    for (const row of filtered) {
      const date = String(row.createdAt || '').slice(0, 10) || 'Unknown';
      if (!map.has(date)) map.set(date, []);
      map.get(date).push(row);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  return (
    <div className="adm-screen">
      <div className="adm-stats">
        <StatTile label="Total entries" value={fmtInt(rows.length)} />
        <StatTile label="Actions today" value={fmtInt(filtered.filter((r) => String(r.createdAt || '').startsWith(new Date().toISOString().slice(0, 10))).length)} />
        <StatTile label="Unique actions" value={fmtInt(actions.length - 1)} />
        <StatTile label="Unique entities" value={fmtInt(entityTypes.length - 1)} />
      </div>

      <div className="adm-card">
        <div className="adm-card-head">
          <div>
            <span className="be-eyebrow">Compliance</span>
            <h2 className="adm-card-title">Audit log</h2>
          </div>
          <div className="adm-card-actions">
            <div className="adm-search">
              <I icon={Search} size={14} />
              <input
                type="text"
                placeholder="Search action, entity, reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select className="be-select be-select-sm" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
              {actions.map((a) => <option key={a} value={a}>{a === 'all' ? 'All actions' : a}</option>)}
            </select>
            <select className="be-select be-select-sm" value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)}>
              {entityTypes.map((et) => <option key={et} value={et}>{et === 'all' ? 'All entities' : et}</option>)}
            </select>
          </div>
        </div>

        {loading && <div className="adm-skeleton">Loading audit logs...</div>}

        {!loading && filtered.length === 0 && (
          <div className="adm-empty-state adm-empty-state--lg">
            <I icon={History} size={32} />
            <p>No audit log entries match the current filters.</p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="adm-timeline">
            {groupedByDate.map(([date, entries]) => (
              <div key={date} className="adm-timeline-group">
                <div className="adm-timeline-date">{date}</div>
                <table className="adm-table">
                  <thead><tr>
                    <th>Time</th><th>Action</th><th>Entity</th><th>ID</th><th>Admin</th><th>Reason</th><th></th>
                  </tr></thead>
                  <tbody>
                    {entries.map((r) => (
                      <tr key={r.id}>
                        <td className="be-num adm-cell-meta">{String(r.createdAt || '').slice(11, 19)}</td>
                        <td><code className="adm-code">{r.action}</code></td>
                        <td>{r.entityType}</td>
                        <td><code className="adm-code">{String(r.entityId || '').slice(0, 12)}...</code></td>
                        <td className="adm-cell-meta">{r.adminId ? String(r.adminId).slice(0, 8) + '...' : 'System'}</td>
                        <td>{r.reason || '—'}</td>
                        <td className="adm-cell-actions">
                          <button
                            className="be-btn be-btn-ghost be-btn-sm"
                            onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                          >
                            <I icon={expandedId === r.id ? ChevronUp : ChevronDown} size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {entries.some((r) => expandedId === r.id) && (
                      <tr className="adm-detail-row">
                        <td colSpan={7}>
                          {entries.filter((r) => expandedId === r.id).map((r) => (
                            <div key={r.id} className="adm-code-block">
                              <pre>
                                {JSON.stringify({ before: r.before, after: r.after, ip: r.ipAddress, ua: r.userAgent }, null, 2)}
                              </pre>
                            </div>
                          ))}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AuditLogScreen;
