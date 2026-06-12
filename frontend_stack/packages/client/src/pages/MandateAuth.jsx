import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Info } from 'lucide-react';
import AppBar from '../layout/AppBar.jsx';
import Skeleton from '@beonedge/shared/components/Skeleton.jsx';
import * as ordersApi from '../services/ordersApi.js';
import { fmtMoney, fmtDate } from '../utils/format.js';

export default function MandateAuth() {
  const { mandateId } = useParams();
  const navigate = useNavigate();
  const [mandate, setMandate] = useState(null);
  const [completing, setCompleting] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => { ordersApi.getMandate(mandateId).then(setMandate).catch(() => setMandate(null)); }, [mandateId]);

  if (!mandate) return (<><AppBar title="Authorize AutoPay" /><div className="apk-screen"><Skeleton variant="card" height={200} /></div></>);

  const isRazorpayPending = mandate.provider === 'razorpay' && !mandate.providerMandateId;
  const isMock = mandate.provider === 'mock';

  async function onComplete() {
    setCompleting(true);
    const updated = await ordersApi.authorizeMandate(mandateId);
    setMandate(updated);
    setCompleting(false);
    setTimeout(() => navigate('/app/dashboard'), 600);
  }

  function onOpenUpi() {
    setToast('UPI app deep-link copied. Open your UPI app to authorize.');
    setTimeout(() => setToast(''), 2400);
  }

  return (
    <>
      <AppBar title="Authorize AutoPay" />
      <div className="apk-screen">
        <h1 className="apk-h-sm">Authorize UPI AutoPay</h1>

        {isRazorpayPending ? (
          <div className="be-card be-pad-6 apk-text-center">
            <Info size={40} strokeWidth={1.5} className="apk-auth-icon" />
            <h3 className="apk-auth-title">AutoPay setup is pending</h3>
            <p className="apk-body-text">
              Your UPI AutoPay mandate will be set up automatically after your first successful payment.
              You don't need to do anything right now.
            </p>
          </div>
        ) : (
          <div className="be-card apk-mandate-card">
            <ol aria-label="AutoPay authorization steps" className="apk-steps-list">
              {['Open UPI app', `Authorize mandate up to ${fmtMoney(mandate.maxAmount)}`, 'Return to app'].map((step, i) => (
                <li key={i} className="apk-timeline-row">
                  <div className="apk-timeline-dot is-active" />
                  <div>{i + 1}. {step}</div>
                  <div />
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="be-card apk-mandate-card">
          <div className="apk-sheet-summary-row"><span>Max per cycle</span><strong className="be-money">{fmtMoney(mandate.maxAmount)}</strong></div>
          {mandate.validTo && <div className="apk-sheet-summary-row"><span>Valid until</span><strong>{fmtDate(mandate.validTo)}</strong></div>}
          <div className="apk-sheet-summary-row"><span>Status</span>
            <span className={'be-badge ' + (mandate.status === 'active' ? 'be-badge-active' : 'be-badge-paused')}>
              <span className="be-badge-dot" />{mandate.status === 'active' ? 'Active' : mandate.status.replace('_', ' ')}
            </span>
          </div>
          {mandate.provider && (
            <div className="apk-sheet-summary-row"><span>Provider</span><span className="be-badge be-badge-neutral">{mandate.provider}</span></div>
          )}
        </div>

        <div className="be-disclosure">
          {mandate.validTo
            ? `We can debit only up to ${fmtMoney(mandate.maxAmount)} per cycle until ${fmtDate(mandate.validTo)}. You can pause or cancel from support.`
            : `We can debit only up to ${fmtMoney(mandate.maxAmount)} per cycle. You can pause or cancel from support.`}
        </div>

        {mandate.status === 'active' && (
          <div className="be-disclosure">Your UPI AutoPay mandate is active.</div>
        )}

        {!isRazorpayPending && (
          <div className="apk-action-bar">
            <button className="be-btn be-btn-secondary be-btn-lg" onClick={onComplete} disabled={completing || mandate.status === 'active'}>
              {mandate.status === 'active' ? 'Authorized' : completing ? 'Verifying…' : "I've completed authorization"}
            </button>
            {isMock && (
              <button className="be-btn be-btn-primary be-btn-lg" onClick={onOpenUpi}>Open UPI app</button>
            )}
          </div>
        )}

        {isRazorpayPending && (
          <div className="apk-action-bar">
            <button className="be-btn be-btn-primary be-btn-lg" onClick={() => navigate('/app/dashboard')}>
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
      {toast && <div className="apk-toast">{toast}</div>}
    </>
  );
}
