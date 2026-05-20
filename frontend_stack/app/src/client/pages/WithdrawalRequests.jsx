import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCcw, Clock, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
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
    pending: { icon: Clock, color: 'var(--be-amber)', bg: 'var(--be-amber-soft)', label: 'Pending' },
    approved: { icon: CheckCircle, color: 'var(--be-green)', bg: 'var(--be-green-soft)', label: 'Approved' },
    rejected: { icon: XCircle, color: 'var(--be-red)', bg: 'var(--be-red-soft)', label: 'Rejected' },
  };

  return (
    <div className="apk-screen">
      <button className="apk-back-link" onClick={() => navigate(-1)} style={{ marginBottom: 8 }}>
        <ArrowLeft size={16} strokeWidth={1.5} />
        <span>Back</span>
      </button>
      <h1 className="apk-h">Withdrawal Requests</h1>
      <p style={{ fontSize: 13, color: 'var(--be-slate)', marginBottom: 16 }}>
        Track your redemption requests. Funds are returned after admin approval.
      </p>

      {loading && (
        <div className="apk-strategy-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="be-card apk-skel" style={{ height: 80 }} />
          ))}
        </div>
      )}

      {!loading && requests.length === 0 && (
        <div className="be-card apk-empty apk-empty-search">
          <RotateCcw size={40} strokeWidth={1.5} />
          <p style={{ fontWeight: 500 }}>No withdrawal requests yet.</p>
          <button className="be-btn be-btn-secondary be-btn-sm" onClick={() => navigate('/app/portfolio')}>
            Go to Portfolio
          </button>
        </div>
      )}

      {!loading && requests.map((req) => {
        const cfg = statusConfig[req.status] || statusConfig.pending;
        const Icon = cfg.icon;
        return (
          <div key={req.id} className="be-card" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <div style={{ fontFamily: 'var(--be-font-serif)', fontSize: 16, fontWeight: 600 }}>{req.fundName || 'Fund'}</div>
                <div style={{ fontSize: 12, color: 'var(--be-slate)', marginTop: 2 }}>{fmtDate(req.requestedAt)}</div>
              </div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '3px 10px',
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 500,
                  background: cfg.bg,
                  color: cfg.color,
                }}
              >
                <Icon size={12} strokeWidth={2} />
                {cfg.label}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="be-eyebrow">Amount</div>
                <div className="be-money" style={{ fontSize: 18, fontWeight: 600 }}>{fmtMoney(req.amount)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="be-eyebrow">Type</div>
                <div style={{ fontSize: 14, textTransform: 'capitalize' }}>{req.type}</div>
              </div>
            </div>
            {req.adminReason && (
              <div style={{ marginTop: 10, padding: 8, background: 'var(--be-bone)', borderRadius: 4, fontSize: 12, color: 'var(--be-slate)' }}>
                <strong>Admin note:</strong> {req.adminReason}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
