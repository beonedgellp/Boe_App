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
import I from '../components/I.jsx';
import ApprovalStatusBadge from '../components/ApprovalStatusBadge.jsx';
import { initials } from '../helpers/formatters.js';
import { displayRole } from '../helpers/formatters.js';

function ApprovalReviewPanel({ row, reason, busy, error, onReasonChange, onClose, onDecision }) {
  if (!row) return null;

  const identityDetails = [
    ['Name', row.name || 'Client'],
    ['Role', displayRole(row)],
    ['Approval reference', row.approvalRef || 'Not assigned'],
  ];

  const contactDetails = [
    ['Email', row.email || 'Not provided'],
    ['Phone', row.phone || 'Not provided'],
    ['Signed up', row.createdAt || 'Not recorded'],
  ];

  const statusDetails = [
    ['Account status', row.status || 'pending_review'],
    ['KYC status', row.kycStatus || 'pending'],
    ['Risk profile', row.riskProfileStatus || 'pending'],
  ];

  return (
    <div className="adm-review-overlay" role="presentation" onMouseDown={onClose}>
      <section
        className="adm-review-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="adm-review-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="adm-review-head">
          <div className="adm-user">
            <div className="adm-avatar adm-avatar-lg">{initials(row.name, 'CL')}</div>
            <div>
              <span className="be-eyebrow">Client approval</span>
              <h2 id="adm-review-title">{row.name || 'Client'}</h2>
              <div className="adm-review-email">{row.email}</div>
            </div>
          </div>
          <button className="adm-icon-btn" onClick={onClose} aria-label="Close review" disabled={busy}><I icon={X}/></button>
        </div>

        <div className="adm-review-status">
          <ApprovalStatusBadge status={row.status} />
        </div>

        <div className="adm-review-section">
          <div className="adm-review-section-title"><I icon={User} size={14}/> Identity</div>
          <div className="adm-review-grid">
            {identityDetails.map(([label, value]) => (
              <div className="adm-review-field" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="adm-review-section">
          <div className="adm-review-section-title"><I icon={Mail} size={14}/> Contact</div>
          <div className="adm-review-grid">
            {contactDetails.map(([label, value]) => (
              <div className="adm-review-field" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="adm-review-section">
          <div className="adm-review-section-title"><I icon={Shield} size={14}/> Status</div>
          <div className="adm-review-grid">
            {statusDetails.map(([label, value]) => (
              <div className="adm-review-field" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="adm-review-section">
          <div className="adm-review-section-title"><I icon={FileText} size={14}/> Review</div>
          <label className="adm-field adm-review-notes">
            <textarea
              value={reason}
              onChange={(event) => onReasonChange(event.target.value)}
              placeholder="Record the reason, KYC observation, or admin decision note."
              disabled={busy}
            />
          </label>
        </div>

        {error && <div className="adm-review-error">{error}</div>}

        <div className="adm-review-actions">
          <button className="be-btn be-btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="be-btn be-btn-danger" onClick={() => onDecision(row, 'rejected')} disabled={busy}>
            <I icon={XCircle} size={16}/> Reject
          </button>
          <button className="be-btn be-btn-primary" onClick={() => onDecision(row, 'approved')} disabled={busy}>
            <I icon={CheckCircle2} size={16}/> Approve
          </button>
        </div>
      </section>
    </div>
  );
}


export default ApprovalReviewPanel;
