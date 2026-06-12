import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCcw, Clock, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { EmptyState, Skeleton } from '@beonedge/shared';
import * as fundsApi from '../services/fundsApi.js';
import { fmtMoney, fmtDate } from '../utils/format.js';

export default function WithdrawalRequests() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fundsApi.listRedemptionRequests()
      .then((data) => { setRequests(data); setLoading(false); })
      .catch(() => { setRequests([]); setLoading(false); });
  }, []);

  const statusConfig = {
    pending: { icon: Clock, label: 'Pending' },
    approved: { icon: CheckCircle, label: 'Approved' },
    rejected: { icon: XCircle, label: 'Rejected' },
  };

  return (
    <div className="apk-screen">
      <button className="apk-back-link apk-withdrawal-back" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} strokeWidth={1.5} />
        <span>Back</span>
      </button>
      <span className="be-eyebrow">Manage funds</span>
      <h1 className="apk-h">Withdrawal Requests</h1>
      <p className="apk-withdrawal-sub">
        Track your redemption requests. Funds are returned after admin approval.
      </p>

      {loading && (
        <div className="apk-strategy-grid">
          <Skeleton variant="rect" height="80px" count={3} />
        </div>
      )}

      {!loading && requests.length === 0 && (
        <EmptyState
          icon={<RotateCcw size={40} strokeWidth={1.5} />}
          title="No withdrawal requests yet"
          description="Track your redemption requests here once you submit one."
          action={
            <button className="be-btn be-btn-secondary be-btn-sm" onClick={() => navigate('/app/portfolio')}>
              Go to Portfolio
            </button>
          }
        />
      )}

      {!loading && requests.map((req) => {
        const cfg = statusConfig[req.status] || statusConfig.pending;
        const Icon = cfg.icon;
        return (
          <div key={req.id} className="be-card apk-withdrawal-card">
            <div className="apk-withdrawal-card-head">
              <div>
                <div className="apk-withdrawal-fund">{req.fundName || 'Fund'}</div>
                <div className="apk-withdrawal-date">{fmtDate(req.requestedAt)}</div>
              </div>
              <span className={`apk-status-pill apk-status-pill--${req.status || 'pending'}`}>
                <Icon size={12} strokeWidth={2} />
                {cfg.label}
              </span>
            </div>
            <div className="apk-withdrawal-amount-row">
              <div>
                <div className="be-eyebrow">Amount</div>
                <div className="be-money apk-withdrawal-amount">{fmtMoney(req.amount)}</div>
              </div>
              <div className="apk-withdrawal-type">
                <div className="be-eyebrow">Type</div>
                <div className="apk-withdrawal-type-value">{req.type}</div>
              </div>
            </div>
            {req.adminReason && (
              <div className="apk-withdrawal-note">
                <strong>Admin note:</strong> {req.adminReason}
              </div>
            )}
          </div>
        );
      })}
      <p className="be-disclosure">
        Redemption requests require approval. Final values may vary with market movement until units are processed.
      </p>
    </div>
  );
}
