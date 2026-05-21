import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { X, Loader2, CheckCircle, XCircle, CreditCard } from 'lucide-react';
import AppBar from '../layout/AppBar.jsx';
import * as ordersApi from '../services/ordersApi.js';
import { fmtMoney, fmtDate } from '../utils/format.js';
import { openRazorpayCheckout } from '../utils/razorpay.js';

const TIMELINE = [
  { key: 'created', label: 'Created' },
  { key: 'gateway_initiated', label: 'Gateway initiated' },
  { key: 'pending', label: 'Awaiting confirmation' },
  { key: 'success', label: 'Confirmed' },
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
      if (p.status === 'success' || p.status === 'failed') clearInterval(polling.current);
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

  if (!payment) return (<><AppBar title="Payment" leftIcon={X} /><div className="apk-screen"><div className="apk-skel" style={{ height: 200 }} /></div></>);

  const isSuccess = payment.status === 'success' || payment.status === 'reconciled';
  const isFailed = payment.status === 'failed' || payment.status === 'expired';
  const isCreated = payment.status === 'created';
  const Icon = isSuccess ? CheckCircle : isFailed ? XCircle : Loader2;
  const stateLine = isSuccess ? 'Payment received' : isFailed ? "Payment couldn't be confirmed" : 'Awaiting payment…';
  const tlIdx = TIMELINE.findIndex((t) => t.key === payment.status);

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
          <div className="apk-payment-icon-wrap" style={{ color: isSuccess ? 'var(--be-green)' : isFailed ? 'var(--be-red)' : 'var(--be-slate)' }}>
            <Icon size={32} strokeWidth={1.5} className={!isSuccess && !isFailed ? 'apk-spin' : ''} />
          </div>
          <div className="apk-payment-state-line">{stateLine}</div>
          <div className="apk-payment-amount be-money">{fmtMoney(payment.amount)}</div>
          <div className="apk-payment-method">{payment.upiHandle ? `UPI · ${payment.upiHandle}` : 'Payment method pending'}</div>
          {isFailed && payment.failureReason && <div className="be-disclosure" style={{ color: 'var(--be-red)' }}>{payment.failureReason}</div>}
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

        <div className="be-disclosure">{!isSuccess && !isFailed ? "We'll auto-retry status checks for 90 seconds." : 'We do not store your UPI PIN.'}</div>

        {isSuccess && (
          <div className="be-disclosure">Investments are subject to market risk. Monitor your portfolio from the dashboard.</div>
        )}

        <div className="apk-action-bar">
          {showPayButton && (
            <button className="be-btn be-btn-primary be-btn-block be-btn-lg" onClick={handlePayNow}>
              <CreditCard size={18} strokeWidth={2} style={{ marginRight: 8 }} /> Pay with Razorpay
            </button>
          )}
          {showRazorpayConfigError && (
            <div className="apk-banner apk-banner-red">
              Razorpay checkout is not configured for this payment.
            </div>
          )}
          {isSuccess && (
            <>
              <button className="be-btn be-btn-secondary be-btn-lg" onClick={() => navigate('/app/transactions')}>View transaction</button>
              <button className="be-btn be-btn-primary be-btn-lg" onClick={onContinue}>Continue</button>
            </>
          )}
          {isFailed && (
            <>
              <button className="be-btn be-btn-secondary be-btn-lg" onClick={() => window.location.reload()}>Use another UPI handle</button>
              <button className="be-btn be-btn-primary be-btn-lg" onClick={() => window.location.reload()}>Retry payment</button>
            </>
          )}
          {!isSuccess && !isFailed && !showPayButton && (
            <button className="be-btn be-btn-ghost be-btn-block be-btn-lg" onClick={() => navigate('/app/dashboard')}>Cancel payment</button>
          )}
        </div>
      </div>
    </>
  );
}
