import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { X, Loader2, CheckCircle, XCircle, CreditCard } from 'lucide-react';
import { Skeleton } from '@beonedge/shared';
import AppBar from '../layout/AppBar.tsx';
import * as ordersApi from '../services/ordersApi.ts';
import { fmtMoney, fmtDate } from '../utils/format.ts';
import { openRazorpayCheckout } from '../utils/razorpay.ts';

const TIMELINE = [
  { key: 'created', label: 'Created' },
  { key: 'gateway_initiated', label: 'Gateway initiated' },
  { key: 'pending', label: 'Awaiting confirmation' },
  { key: 'success', label: 'Payment received' },
  { key: 'approved', label: 'Admin approved' },
];

export default function PaymentStatus() {
  const { paymentId } = useParams();
  const navigate = useNavigate();
  const [payment, setPayment] = useState(null);
  const [order, setOrder] = useState(null);
  const rzpInitiatedRef = useRef(false);
  const polling = useRef(null);

  const loadPayment = useCallback(async () => {
    const p = await ordersApi.getPayment(paymentId);
    setPayment(p);
    if (p.orderId) {
      const o = await ordersApi.getOrder(p.orderId);
      setOrder(o);
    }
    return p;
  }, [paymentId]);

  useEffect(() => {
    let mounted = true;
    loadPayment();
    polling.current = setInterval(async () => {
      const p = await ordersApi.pollPaymentStatus(paymentId);
      if (!mounted) return;
      setPayment(p);
      if (['success', 'reconciled', 'approved', 'failed', 'expired', 'rejected'].includes(p.status)) {
        clearInterval(polling.current);
      }
    }, 2000);
    return () => { mounted = false; if (polling.current) clearInterval(polling.current); };
  }, [paymentId, loadPayment]);

  const handlePayNow = useCallback(() => {
    if (!payment?.providerPaymentId || !payment?.amount) return;
    openRazorpayCheckout({
      keyId: payment.providerKeyId,
      orderId: payment.providerOrderId || payment.providerPaymentId,
      amount: payment.amount,
      currency: payment.currency,
      name: order?.fundName || (order?.type === 'sip' ? 'Monthly SIP' : 'One-time Investment'),
      description: order?.type === 'sip' ? 'SIP Setup' : 'Lumpsum Investment',
      userEmail: payment.userEmail || '',
      userContact: payment.userPhone || '',
      onSuccess: async (response) => {
        rzpInitiatedRef.current = true;
        await ordersApi.confirmRazorpayPayment(paymentId, response);
        await loadPayment();
      },
      onFailure: (error) => {
        rzpInitiatedRef.current = false;
        loadPayment();
      },
    });
  }, [payment, order, loadPayment]);

  if (!payment) return (<><AppBar title="Payment" leftIcon={X} /><div className="apk-screen"><Skeleton variant="rect" height="200px" /></div></>);

  const isSuccess = payment.status === 'success' || payment.status === 'reconciled' || payment.status === 'approved';
  const isAwaitingApproval = payment.status === 'success' || payment.status === 'reconciled';
  const isFailed = payment.status === 'failed' || payment.status === 'expired' || payment.status === 'rejected';
  const isCreated = payment.status === 'created';
  const Icon = isSuccess ? CheckCircle : isFailed ? XCircle : Loader2;
  const stateLine = isAwaitingApproval
    ? 'Payment received, awaiting admin approval'
    : isSuccess
      ? 'Payment approved'
      : isFailed
        ? "Payment couldn't be confirmed"
        : 'Awaiting payment…';
  const timelineStatus = payment.status === 'reconciled' ? 'success' : payment.status;
  const tlIdx = TIMELINE.findIndex((t) => t.key === timelineStatus);

  function onContinue() {
    if (order?.type === 'sip' && order.mandateId && payment?.provider === 'mock') navigate(`/app/mandates/${order.mandateId}/authorize`);
    else navigate('/app/dashboard');
  }

  const showPayButton = isCreated && payment.provider === 'razorpay' && payment.providerPaymentId && payment.providerKeyId;
  const showRazorpayConfigError = isCreated && payment.provider === 'razorpay' && payment.providerPaymentId && !payment.providerKeyId;

  return (
    <>
      <AppBar title="Payment" leftIcon={X} onLeft={() => navigate('/app/dashboard')} />
      <div className="apk-screen">
        <div className="apk-payment-state">
          <div className={`apk-payment-icon-wrap ${isSuccess ? 'apk-payment-icon-wrap--success' : isFailed ? 'apk-payment-icon-wrap--failed' : ''}`}>
            <Icon size={32} strokeWidth={1.5} className={!isSuccess && !isFailed ? 'apk-spin' : ''} />
          </div>
          <div className="apk-payment-state-line">{stateLine}</div>
          <div className="apk-payment-amount be-money">{fmtMoney(payment.amount)}</div>
          <div className="apk-payment-method">{payment.upiHandle ? `UPI · ${payment.upiHandle}` : 'Payment method pending'}</div>
          {isFailed && payment.failureReason && <div className="be-disclosure apk-payment-error">{payment.failureReason}</div>}
        </div>

        <div className="be-card apk-timeline">
          {TIMELINE.map((t, i) => (
            <div key={t.key} className="apk-timeline-row">
              <div className={'apk-timeline-dot' + (i < tlIdx ? ' is-done' : i === tlIdx ? ' is-active' : '')} />
              <div>{t.label}</div>
              <div className="apk-timeline-ts">{i <= tlIdx ? fmtDate(payment.createdAt, { withTime: true }).split(',')[1] : ''}</div>
            </div>
          ))}
        </div>

        <div className="be-disclosure">{!isSuccess && !isFailed ? "We'll keep checking the gateway status for 90 seconds." : 'We do not store your UPI PIN.'}</div>

        {isAwaitingApproval && (
          <div className="be-disclosure">Your payment is now with the admin portal for approval. Portfolio and fund pool values update after approval.</div>
        )}

        {payment.status === 'approved' && (
          <div className="be-disclosure">The approved amount has been posted to your selected fund pool and portfolio.</div>
        )}

        <div className="apk-action-bar">
          {showPayButton && (
            <button className="be-btn be-btn-primary be-btn-block be-btn-lg" onClick={handlePayNow}>
              <CreditCard size={18} strokeWidth={2} className="apk-pay-icon" /> Pay with Razorpay
            </button>
          )}
          {showRazorpayConfigError && (
            <div className="apk-banner apk-banner-red">
              Razorpay checkout is not configured for this payment.
            </div>
          )}
          {isSuccess && (
            <>
              <button
                className="be-btn be-btn-secondary be-btn-lg"
                onClick={() => navigate(isAwaitingApproval ? '/app/transactions?tab=approval' : '/app/transactions')}
              >
                View transaction
              </button>
              <button className="be-btn be-btn-primary be-btn-lg" onClick={onContinue}>Continue</button>
            </>
          )}
          {isFailed && (
            <button className="be-btn be-btn-secondary be-btn-block be-btn-lg" onClick={() => navigate('/app/transactions')}>View transactions</button>
          )}
          {!isSuccess && !isFailed && !showPayButton && (
            <button className="be-btn be-btn-ghost be-btn-block be-btn-lg" onClick={() => navigate('/app/dashboard')}>Cancel payment</button>
          )}
        </div>
      </div>
    </>
  );
}
