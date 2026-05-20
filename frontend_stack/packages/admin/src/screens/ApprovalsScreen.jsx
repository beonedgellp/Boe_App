import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  UserCheck, ShieldCheck, LineChart, Layers, TrendingUp, PieChart,
  CreditCard, Repeat, BookOpen, Inbox, LifeBuoy, History, Settings,
  Search, Bell, Plus, MoreHorizontal, LayoutGrid, Trash2, Save, RotateCcw, LogOut,
  X, CheckCircle2, XCircle, Clock, Timer, TrendingDown, Filter, User, Mail, Phone, Shield, FileText,
  BarChart3, Activity, Eye, EyeOff, AlertTriangle, Pencil, Gauge, Percent, Briefcase, Archive, ChevronRight, ClipboardList, ArrowLeft,
  Copy,
} from 'lucide-react';
import {
  RiskBadge, LifecycleBadge, StatusBadge,
} from '@beonedge/shared/components/Badges.jsx';
import { SectorMiniBar } from '@beonedge/shared/components/SectorMiniBar.jsx';

import logo from '@beonedge/shared/assets/logo.svg';
import {
  COMPONENT_LIBRARY,
  loadRemoteAppConfig,
  loadAppConfig,
  publishAppConfig,
  resetAppConfig,
} from '@beonedge/shared/appConfig.js';
import { useAdminSession } from '@beonedge/client/store/AdminSessionContext.jsx';
import { apiRequest, listFromPayload, useHttpApi } from '@beonedge/client/services/_util.js';
import { listPendingApprovals } from '@beonedge/client/services/authApi.js';
import '../styles/desktop/admin.css';
import '../styles/mobile/admin.css';
import I from '../components/I.jsx';
import StatTile from '../components/StatTile.jsx';
import EmptyTableRow from '../components/EmptyTableRow.jsx';
import IndeterminateCheckbox from '../components/IndeterminateCheckbox.jsx';
import ApprovalStatusBadge from '../components/ApprovalStatusBadge.jsx';
import SkeletonTile from '../components/SkeletonTile.jsx';
import SkeletonTableRow from '../components/SkeletonTableRow.jsx';
import { fmtInt } from '../helpers/formatters.js';
import { initials } from '../helpers/formatters.js';
import { displayRole } from '../helpers/formatters.js';

function ApprovalsScreen({ rows = [], stats = {}, loading = false, onReview, onApprove, onUserDetail, onNavigateToUsers, busy = false }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => {
    setSelectedIds(new Set());
  }, [rows, searchQuery, statusFilter]);

  const filteredRows = rows.filter((r) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q || r.name?.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || String(r.status || '').toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const pendingCount = rows.filter((r) => ['draft','pending_review','kyc_pending'].includes(r.status)).length;

  const visibleRows = filteredRows;
  const allVisibleSelected = visibleRows.length > 0 && visibleRows.every((r) => selectedIds.has(r.id));
  const someSelected = visibleRows.some((r) => selectedIds.has(r.id));

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allVisibleSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleRows.map((r) => r.id)));
    }
  }

  function handleBulkApprove() {
    // Bulk approve not yet implemented — backend endpoint needed
  }
  function handleBulkReject() {
    // Bulk reject not yet implemented — backend endpoint needed
  }

  return (
    <div className="adm-screen">
      <div className="adm-stats">
        {loading ? (
          <>
            <SkeletonTile />
            <SkeletonTile />
            <SkeletonTile />
            <SkeletonTile />
          </>
        ) : (
          <>
            <StatTile label="Pending approvals" value={fmtInt(stats.pendingApprovals)} icon={Clock} tone="amber" delta="+2 this week" deltaTone="adm-tone-amber" />
            <StatTile label="Approved clients" value={fmtInt(stats.approvedThisWeek)} icon={CheckCircle2} tone="green" delta="+5 this week" deltaTone="adm-tone-green" />
            <StatTile label="Rejected clients" value={fmtInt(stats.rejectedThisWeek)} icon={XCircle} tone="red" delta="-1 this week" deltaTone="adm-tone-red" />
            <StatTile label="Avg. review time" value={stats.avgReviewTime || '0h'} icon={Timer} tone="slate" hint="Per approval" />
          </>
        )}
      </div>

      <div className="adm-card adm-table">
        <div className="adm-card-head">
          <div>
            <span className="be-eyebrow">Pending Queue</span>
            <h3 className="adm-card-title">Awaiting approval</h3>
          </div>
          <div className="adm-card-actions">
            <button className="be-btn be-btn-secondary be-btn-sm">Export CSV</button>
          </div>
        </div>

        <div className="adm-toolbar">
          <div className="adm-search">
            <I icon={Search} size={14} />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="adm-filter">
            <I icon={Filter} size={14} />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All pending</option>
              <option value="pending_review">Pending review</option>
              <option value="draft">Draft</option>
              <option value="kyc_pending">KYC pending</option>
            </select>
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="adm-bulk-bar">
            <span className="adm-bulk-count">{selectedIds.size} selected</span>
            <div className="adm-bulk-actions">
              <button className="be-btn be-btn-primary be-btn-sm" onClick={handleBulkApprove} disabled title="Bulk approve coming soon">
                <I icon={CheckCircle2} size={14} /> Approve {selectedIds.size} selected
              </button>
              <button className="be-btn be-btn-danger be-btn-sm" onClick={handleBulkReject} disabled title="Bulk reject coming soon">
                <I icon={XCircle} size={14} /> Reject {selectedIds.size} selected
              </button>
            </div>
          </div>
        )}

        <div className="adm-table-scroll">
          <table>
            <thead>
              <tr>
                <th className="adm-col-checkbox">
                  <IndeterminateCheckbox
                    checked={allVisibleSelected}
                    indeterminate={someSelected && !allVisibleSelected}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="adm-col-user">User</th>
                <th className="adm-col-date">Signed up</th>
                <th className="adm-col-status">Status</th>
                <th className="adm-col-role">Role</th>
                <th className="adm-col-actions"></th>
              </tr>
            </thead>
            <tbody>
              {loading && visibleRows.length === 0 && (
                <>
                  <SkeletonTableRow />
                  <SkeletonTableRow />
                  <SkeletonTableRow />
                  <SkeletonTableRow />
                  <SkeletonTableRow />
                </>
              )}
              {!loading && visibleRows.length === 0 && (
                <EmptyTableRow colSpan={6}>
                  {rows.length === 0
                    ? "No pending approvals. Great job!"
                    : "No records match the current filter."}
                </EmptyTableRow>
              )}
              {visibleRows.map((r) => (
                <tr key={r.id || r.email} className={selectedIds.has(r.id) ? 'is-selected' : ''}>
                  <td className="adm-col-checkbox">
                    <input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => toggleSelect(r.id)} />
                  </td>
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
                    <span className="adm-cell-meta">{r.createdAt || 'Not recorded'}</span>
                  </td>
                  <td className="adm-col-status">
                    <ApprovalStatusBadge status={r.status} />
                  </td>
                  <td className="adm-col-role">{displayRole(r)}</td>
                  <td className="adm-col-actions">
                    <button className="be-btn be-btn-secondary be-btn-sm" onClick={() => onReview?.(r)}>Review</button>
                    <button className="be-btn be-btn-ghost be-btn-sm" onClick={() => onUserDetail?.(r)}>View</button>
                    <button className="be-btn be-btn-primary be-btn-sm" onClick={() => onApprove?.(r)} disabled={busy}>Approve</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {rows.length === 0 && !loading && (
        <div className="adm-empty-hint">
          Looking for approved users? <a onClick={onNavigateToUsers}>View User Details</a>
        </div>
      )}
    </div>
  );
}

export default ApprovalsScreen;
