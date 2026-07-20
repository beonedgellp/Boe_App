import { useState } from 'react';
import { Search, LineChart } from 'lucide-react';
import I from '../components/I.tsx';
import StatTile from '../components/StatTile.tsx';
import EmptyTableRow from '../components/EmptyTableRow.tsx';
import SkeletonTile from '../components/SkeletonTile.tsx';
import SkeletonTableRow from '../components/SkeletonTableRow.tsx';
import { fmtInt } from '../helpers/formatters.ts';
import { initials } from '../helpers/formatters.ts';

export default function RiskProfilesScreen({ rows = [], loading = false, onUserDetail }) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRows = rows.filter((r) => {
    const q = searchQuery.trim().toLowerCase();
    return !q || r.name?.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q);
  });

  const totalCount = rows.length;

  return (
    <div className="adm-screen">
      <div className="adm-stats">
        {loading ? (
          <>
            <SkeletonTile />
          </>
        ) : (
          <StatTile label="Total Profiles" value={fmtInt(totalCount)} icon={LineChart} tone="ink" />
        )}
      </div>

      <div className="adm-card adm-table">
        <div className="adm-card-head">
          <div>
            <span className="be-eyebrow">Risk Profiles</span>
            <h2 className="adm-card-title">Client Risk Profiles</h2>
          </div>
        </div>

        <div className="adm-toolbar">
          <div className="adm-search">
            <I icon={Search} size={14} />
            <input type="text" aria-label="Search risk profiles by name or email" placeholder="Search by name or email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>

        <div className="adm-table-scroll">
          <table>
            <thead>
              <tr>
                <th className="adm-col-user">User</th>
                <th>Age Band</th>
                <th>Horizon</th>
                <th>Income</th>
                <th>Loss Tolerance</th>
                <th>Experience</th>
                <th>Completed</th>
                <th className="adm-col-actions"></th>
              </tr>
            </thead>
            <tbody>
              {loading && filteredRows.length === 0 && (
                <>
                  <SkeletonTableRow />
                  <SkeletonTableRow />
                  <SkeletonTableRow />
                  <SkeletonTableRow />
                </>
              )}
              {!loading && filteredRows.length === 0 && (
                <EmptyTableRow colSpan={8}>No risk profile records are available.</EmptyTableRow>
              )}
              {filteredRows.map((r) => (
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
                  <td>{r.ageBand || '—'}</td>
                  <td>{r.investmentHorizon || '—'}</td>
                  <td>{r.incomeBand || '—'}</td>
                  <td>{r.lossTolerance || '—'}</td>
                  <td>{r.investmentExperience || '—'}</td>
                  <td className="adm-cell-meta">{r.riskCompletedAt ? new Date(r.riskCompletedAt).toLocaleDateString() : '—'}</td>
                  <td className="adm-col-actions">
                    <button className="be-btn be-btn-ghost be-btn-sm" onClick={() => onUserDetail?.(r)}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
