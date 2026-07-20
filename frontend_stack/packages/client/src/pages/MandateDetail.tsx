import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppBar from '../layout/AppBar';
import Skeleton from '@beonedge/shared/components/Skeleton';
import * as ordersApi from '../services/ordersApi';
import { fmtMoney, fmtDate } from '../utils/format';

export default function MandateDetail() {
  const { mandateId } = useParams();
  const navigate = useNavigate();
  const [mandate, setMandate] = useState(null);
  const [order, setOrder] = useState(null);
  const [requests, setRequests] = useState([]);
  const [confirm, setConfirm] = useState(null); // { type, value }
  const [submitting, setSubmitting] = useState(false);
  const [newAmount, setNewAmount] = useState('');

  useEffect(() => {
    ordersApi.getMandate(mandateId).then(async (m) => {
      setMandate(m);
      if (m?.orderId) {
        const o = await ordersApi.getOrder(m.orderId);
        setOrder(o);
        setNewAmount(o?.amount ?? '');
        ordersApi.listSipControlRequests(m.orderId).then(setRequests).catch(() => setRequests([]));
      }
    }).catch(() => setMandate(null));
  }, [mandateId]);

  if (!mandate) return (<><AppBar title="Mandate" /><div className="apk-screen"><Skeleton variant="card" height={200} /></div></>);

  const isRazorpayPending = mandate.provider === 'razorpay' && !mandate.providerMandateId;

  async function submitRequest() {
    if (!confirm || !order) return;
    setSubmitting(true);
    const requestedAmount = newAmount === '' ? null : Number(newAmount);
    const req = await ordersApi.requestSipControl({
      orderId: order.id,
      requestType: confirm.type,
      requestedValue: confirm.type === 'change_amount' && Number.isFinite(requestedAmount) ? requestedAmount : undefined,
    });
    setRequests((r) => [req, ...r]);
    setConfirm(null);
    setSubmitting(false);
  }

  return (
    <>
      <AppBar title="Mandate" />
      <div className="apk-screen">
        <div className="be-card apk-mandate-card">
          <div className="apk-mandate-head">
            <div className="apk-fund-name">{order?.type === 'sip' ? `SIP · ${fmtMoney(order.amount)}/mo` : 'Mandate'}</div>
            <span className={'be-badge ' + (mandate.status === 'active' ? 'be-badge-active' : 'be-badge-paused')}>
              <span className="be-badge-dot" />{mandate.status.replace('_', ' ')}
            </span>
          </div>
          <div className="apk-sheet-summary-row"><span>Max per cycle</span><strong className="be-money">{fmtMoney(mandate.maxAmount)}</strong></div>
          {mandate.validTo && <div className="apk-sheet-summary-row"><span>Valid until</span><strong>{fmtDate(mandate.validTo)}</strong></div>}
        </div>

        <div className="be-eyebrow">Manage SIP</div>
        {isRazorpayPending ? (
          <div className="be-card be-pad-4 apk-text-center">
            <p className="apk-body-text">
              AutoPay setup is pending. Management options will appear after your first successful payment.
            </p>
          </div>
        ) : (
          <div className="apk-mandate-actions">
            <button className="be-btn be-btn-secondary" onClick={() => setConfirm({ type: 'pause' })}>Pause</button>
            <button className="be-btn be-btn-secondary" onClick={() => setConfirm({ type: 'change_amount' })}>Change amount</button>
            <button className="be-btn be-btn-danger" onClick={() => setConfirm({ type: 'cancel' })}>Cancel</button>
          </div>
        )}

        <div className="be-eyebrow apk-mt-3">My recent requests</div>
        {requests.length === 0 ? (
          <div className="be-card apk-empty"><p>No requests yet.</p></div>
        ) : (
          <div className="be-card apk-pad-x">
            {requests.map((r) => (
              <div key={r.id} className="apk-list-row apk-list-row-thin">
                <div>
                  <div className="apk-list-l">{r.requestType.replace('_', ' ')}{r.requestedValue ? ` → ${fmtMoney(r.requestedValue)}` : ''}</div>
                  <div className="apk-list-meta">{fmtDate(r.createdAt, { withTime: true })}</div>
                </div>
                <span className={'be-badge ' + (r.status === 'completed' ? 'be-badge-active' : r.status === 'rejected' ? 'be-badge-failed' : 'be-badge-paused')}>
                  <span className="be-badge-dot" />{r.status}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="be-disclosure">Requests are auditable and reviewed by our team. You'll be notified once processed.</div>
      </div>

      {confirm && (
        <div className="apk-sheet-overlay" onClick={() => !submitting && setConfirm(null)}>
          <div className="apk-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="apk-sheet-handle" />
            <h2 className="apk-h-sm">Confirm {confirm.type.replace('_', ' ')} request</h2>
            <p className="apk-body-text apk-mt-1">
              {confirm.type === 'pause' && 'Pausing stops future debits. Your current investments remain active. You can resume later from this screen.'}
              {confirm.type === 'cancel' && 'Cancelling stops all future debits and terminates the mandate. This cannot be undone.'}
              {confirm.type === 'change_amount' && 'This updates your monthly SIP amount. The change takes effect after review.'}
            </p>
            {confirm.type === 'change_amount' && (
              <div className="be-field apk-mt-3">
                <label>New monthly amount</label>
                <div className="apk-amount-row">
                  <span className="apk-amount-prefix">₹</span>
                  <input className="apk-amount-input be-money" type="number" inputMode="numeric" min={order?.amount ? Math.round(order.amount * 0.5) : 0} step="500" value={newAmount} onChange={(e) => setNewAmount(e.target.value === '' ? '' : Math.max(0, Math.floor(Number(e.target.value))))} placeholder="0" />
                </div>
                {newAmount !== '' && Number(newAmount) < (order?.amount ? Math.round(order.amount * 0.5) : 0) && (
                  <div className="be-field-error apk-mt-1">Minimum is {fmtMoney(order?.amount ? Math.round(order.amount * 0.5) : 0)}.</div>
                )}
              </div>
            )}
            <div className="apk-sheet-actions">
              <button className="be-btn be-btn-secondary apk-flex-1" onClick={() => setConfirm(null)} disabled={submitting}>Cancel</button>
              <button
                className="be-btn be-btn-primary apk-flex-1"
                onClick={submitRequest}
                disabled={submitting || (confirm.type === 'change_amount' && (newAmount === '' || Number(newAmount) < (order?.amount ? Math.round(order.amount * 0.5) : 0)))}
              >
                {submitting ? 'Submitting…' : 'Submit request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
