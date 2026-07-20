import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Clock3, Download, Receipt, Repeat, ShieldCheck } from 'lucide-react';
import { EmptyState, Skeleton } from '@beonedge/shared';
import * as transactionsApi from '../services/transactionsApi.ts';
import * as ordersApi from '../services/ordersApi.ts';
import { fmtMoney, fmtDate, fmtUnits } from '../utils/format.ts';

const TABS = [
  ['all', 'All'],
  ['sip', 'SIP'],
  ['lumpsum', 'Lumpsum'],
  ['pending', 'Pending'],
  ['approval', 'Approval'],
  ['failed', 'Failed'],
];

const PAYMENT_TABS = new Set(['pending', 'failed', 'approval']);
const TAB_KEYS = new Set(TABS.map(([key]) => key));

const EMPTY_STATE = {
  all:     { icon: Receipt,       title: 'No transactions yet', description: 'Once your first SIP runs, it appears here.' },
  sip:     { icon: Repeat,        title: 'No SIP transactions yet', description: 'Start a SIP to see transactions here.' },
  lumpsum: { icon: Receipt,       title: 'No lumpsum transactions yet', description: 'Make a one-time investment to see it here.' },
  pending: { icon: Clock3,        title: 'No pending payments', description: 'All your payments are up to date.' },
  failed:  { icon: AlertTriangle, title: 'No failed payments', description: 'All your payments went through.' },
  approval:{ icon: ShieldCheck,   title: 'No approvals pending', description: 'No payments are waiting for admin approval.' },
};

function fundDisplayName(item) {
  return item?.fund?.name || item?.fundName || item?.fund?.title || item?.fundId || 'Unmapped fund pool';
}

function paymentTypeLabel(value) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'autopay') return 'AutoPay';
  if (normalized === 'manual') return 'Manual';
  return value || 'Payment';
}

export default function Transactions() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab');
  const [tab, setTab] = useState(TAB_KEYS.has(initialTab) ? initialTab : 'all');
  const [items, setItems] = useState(null);
  const [payments, setPayments] = useState(null);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    setItems(null);
    setPayments(null);
    if (PAYMENT_TABS.has(tab)) {
      const loader = tab === 'pending'
        ? ordersApi.listPendingPayments
        : tab === 'failed'
          ? ordersApi.listFailedPayments
          : ordersApi.listApprovalPayments;
      loader().then(setPayments).catch(() => setPayments([]));
    } else {
      transactionsApi.listTransactions({ filter: tab }).then(setItems).catch(() => setItems([]));
    }
  }, [tab]);

  function statusBadgeClass(status) {
    if (['success', 'confirmed', 'reconciled', 'approved'].includes(status)) return 'be-badge-active';
    if (['failed', 'expired', 'rejected', 'payment_failed', 'approval_rejected'].includes(status)) return 'be-badge-failed';
    return 'be-badge-paused';
  }

  function statusLabel(status) {
    const labels = {
      payment_pending: 'Payment pending',
      payment_failed: 'Payment failed',
      awaiting_approval: 'Awaiting approval',
      approval_rejected: 'Approval rejected',
      pending_admin_approval: 'Awaiting approval',
      success: 'Payment received',
      confirmed: 'Payment confirmed',
      reconciled: 'Reconciled',
      approved: 'Approved',
      created: 'Payment created',
      gateway_initiated: 'Gateway started',
      pending: 'Payment pending',
      failed: 'Payment failed',
      expired: 'Payment expired',
      rejected: 'Rejected',
      submitted: 'Submitted',
    };
    return labels[status] || String(status || 'Unknown').replaceAll('_', ' ');
  }

  function typeDotClass(type) {
    if (type === 'sip') return 'apk-tx-dot--sip';
    return 'apk-tx-dot--lumpsum';
  }

  const TxEmptyState = ({ tabKey }) => {
    const { icon: Icon, title, description } = EMPTY_STATE[tabKey] || EMPTY_STATE.all;
    return <EmptyState icon={<Icon size={28} strokeWidth={1.5} />} title={title} description={description} />;
  };

  const PaymentState = () => {
    if (payments === null) {
      return (
        <div className="be-card apk-list-card apk-tx-skeleton--mobile">
          <Skeleton variant="text" height="56px" count={3} />
        </div>
      );
    }

    if (payments.length === 0) return <TxEmptyState tabKey={tab} />;

    return payments.map((payment) => {
      const amount = payment.amount ?? payment.paymentAmount ?? 0;
      const date = payment.date || payment.createdAt || payment.dueDate;
      const fundName = fundDisplayName(payment);
      const title = tab === 'approval' ? 'Waiting for admin approval' : fundName;
      const meta = [
        payment.type ? payment.type.toUpperCase() : null,
        payment.paymentType ? paymentTypeLabel(payment.paymentType) : null,
        date ? fmtDate(date) : null,
        payment.reason || payment.failureReason || null,
      ].filter(Boolean).join(' · ');

      return (
        <div key={payment.paymentId || payment.id} className={`be-card apk-payment-card ${tab === 'failed' ? 'apk-payment-card--failed' : tab === 'approval' ? 'apk-payment-card--approval' : 'apk-payment-card--urgent'}`}>
          <div className="apk-row-head">
            <div>
              <div className="apk-fund-name">{title}</div>
              <div className="apk-cell-meta">{fundName}</div>
              {meta && <div className="apk-cell-meta">{meta}</div>}
            </div>
            <span className={`be-badge ${statusBadgeClass(payment.status)}`}>
              <span className="be-badge-dot" />{statusLabel(payment.status)}
            </span>
          </div>
          <div className="apk-payment-action">
            <div>
              <div className="apk-row-amount be-money">{fmtMoney(amount)}</div>
              {tab === 'approval' && (
                <div className="apk-cell-meta">Portfolio and fund pool update after admin approval.</div>
              )}
            </div>
            <button
              className="be-btn be-btn-secondary be-btn-sm apk-payment-link-btn"
              type="button"
              onClick={() => navigate(`/app/payment/${payment.paymentId || payment.id}`)}
            >
              View payment
            </button>
          </div>
        </div>
      );
    });
  };

  return (
    <div className="apk-screen">
      <h1 className="apk-h">Transactions</h1>
      <div className="apk-tabs" role="tablist" aria-label="Transaction filters">
        {TABS.map(([k, l]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            className={tab === k ? 'is-active' : ''}
            onClick={() => setTab(k)}
          >
            {l}
          </button>
        ))}
      </div>

      {PAYMENT_TABS.has(tab) && <PaymentState />}

      {!PAYMENT_TABS.has(tab) && (
        items === null ? (
          <div className="be-card apk-list-card apk-tx-skeleton--mobile">
            <Skeleton variant="text" height="56px" count={5} />
          </div>
        ) : items.length === 0 ? (
          <TxEmptyState tabKey={tab} />
        ) : (
          <div className="be-card apk-tx-list apk-list-card">
            <div className="apk-tx-list-mobile">
              {items.map((t) => (
                <div
                  key={t.id}
                  className="apk-tx"
                  role="button"
                  tabIndex={0}
                  onClick={() => setOpen(t)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(t); } }}
                >
                  <div className="apk-tx-main">
                    <div className="apk-tx-l">
                      <span className={`apk-tx-dot ${typeDotClass(t.type)}`} />
                      {t.type === 'sip' ? 'SIP' : t.type === 'lumpsum' ? 'Lumpsum' : t.type}
                    </div>
                    <div className="apk-tx-name">{fundDisplayName(t)}</div>
                    <div className="apk-tx-date">{fmtDate(t.date)}</div>
                  </div>
                  <div className="apk-tx-right">
                    <div className="apk-tx-amt be-money">{fmtMoney(t.amount)}</div>
                    <span className={`be-badge apk-tx-status ${statusBadgeClass(t.status)}`}>
                      <span className="be-badge-dot" />{statusLabel(t.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      <div className="be-disclosure">
        {tab === 'approval'
          ? 'Payment has been received. Portfolio and fund pool values update after admin approval.'
          : PAYMENT_TABS.has(tab)
            ? 'Payment status reflects the latest gateway or admin decision available to the app.'
            : 'Showing last 90 days. Older history is available in Statements. Investment values reflect market pricing.'}
      </div>

      {open && (
        <div className={`apk-sheet-overlay ${open ? 'is-open' : ''}`} onClick={() => setOpen(null)} role="dialog" aria-modal="true" aria-label="Transaction details">
          <div className="apk-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="apk-sheet-handle" />
            <h2 className="apk-h-sm apk-tx-sheet-title">{fundDisplayName(open)}</h2>
            <div className="apk-cell-meta apk-sheet-meta">{open.type.toUpperCase()} · {fmtDate(open.date, { withTime: true })}</div>
            <div className="apk-sheet-summary">
              <div className="apk-sheet-summary-row"><span>Amount</span><strong className="be-money">{fmtMoney(open.amount)}</strong></div>
              <div className="apk-sheet-summary-row"><span>Units</span><strong className="be-num">{open.units ? fmtUnits(open.units) : '—'}</strong></div>
              <div className="apk-sheet-summary-row"><span>Mode</span><strong>{open.mode || open.paymentMode || '—'}</strong></div>
              <div className="apk-sheet-summary-row"><span>Payment type</span><strong>{paymentTypeLabel(open.paymentType)}</strong></div>
              <div className="apk-sheet-summary-row"><span>Fund ID</span><strong className="be-mono apk-reference">{open.fund?.trackingId || open.fund?.fundCode || open.fundId || '—'}</strong></div>
              <div className="apk-sheet-summary-row"><span>Reference</span><strong className="be-mono apk-reference">{open.reference || open.referenceId || '—'}</strong></div>
              <div className="apk-sheet-summary-row"><span>Status</span>
                <span className={`be-badge ${statusBadgeClass(open.status)}`}>
                  <span className="be-badge-dot" />{statusLabel(open.status)}
                </span>
              </div>
            </div>
            {open.failureReason && <div className="apk-banner apk-banner-red apk-sheet-gap">{open.failureReason}</div>}
            <button className="be-btn be-btn-secondary be-btn-block apk-sheet-gap" disabled={!open.receiptUrl}>
              <Download size={16} strokeWidth={1.5} /> Download receipt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
