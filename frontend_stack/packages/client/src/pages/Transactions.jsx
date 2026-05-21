import React, { useEffect, useMemo, useState } from 'react';
import { Download, Receipt, Repeat, CheckCircle2 } from 'lucide-react';
import * as transactionsApi from '../services/transactionsApi.js';
import * as ordersApi from '../services/ordersApi.js';
import { fmtMoney, fmtDate, fmtUnits } from '../utils/format.js';

const TABS = [['all','All'],['sip','SIP'],['lumpsum','Lumpsum'],['pending','Pending']];

const EMPTY_STATE = {
  all:     { icon: Receipt,      text: 'No transactions yet. Once your first SIP runs, it appears here.' },
  sip:     { icon: Repeat,       text: 'No SIP transactions yet.' },
  lumpsum: { icon: Receipt,      text: 'No lumpsum transactions yet.' },
  pending: { icon: CheckCircle2, text: 'No pending payments. Your AutoPay debits ran successfully.' },
};

function monthKey(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(iso) {
  const d = new Date(iso);
  const mon = ['January','February','March','April','May','June','July','August','September','October','November','December'][d.getMonth()];
  return `${mon} ${d.getFullYear()}`;
}

export default function Transactions() {
  const [tab, setTab] = useState('all');
  const [items, setItems] = useState(null);
  const [pending, setPending] = useState([]);
  const [open, setOpen] = useState(null);
  const [retrying, setRetrying] = useState(null);

  useEffect(() => {
    setItems(null);
    transactionsApi.listTransactions({ filter: tab }).then(setItems).catch(() => setItems([]));
    if (tab === 'pending') ordersApi.listPendingPayments().then(setPending).catch(() => setPending([]));
  }, [tab]);

  const grouped = useMemo(() => {
    if (!items || tab === 'pending') return [];
    const map = new Map();
    for (const t of items) {
      const k = monthKey(t.date);
      if (!map.has(k)) map.set(k, { label: monthLabel(t.date), items: [] });
      map.get(k).items.push(t);
    }
    return Array.from(map.values());
  }, [items, tab]);

  async function retry(orderId) {
    setRetrying(orderId);
    await ordersApi.payPendingInstallment(orderId);
    setRetrying(null);
    transactionsApi.listTransactions({ filter: tab }).then(setItems);
    ordersApi.listPendingPayments().then(setPending);
  }

  function statusBadgeClass(status) {
    if (status === 'success') return 'be-badge-active';
    if (status === 'failed') return 'be-badge-failed';
    return 'be-badge-paused';
  }

  function typeDotClass(type) {
    if (type === 'sip') return 'apk-tx-dot--sip';
    return 'apk-tx-dot--lumpsum';
  }

  const EmptyState = ({ tabKey }) => {
    const { icon: Icon, text } = EMPTY_STATE[tabKey] || EMPTY_STATE.all;
    return (
      <div className="be-card apk-empty apk-empty--tx">
        <div className="apk-empty-icon-wrap"><Icon size={28} strokeWidth={1.5} /></div>
        <p>{text}</p>
      </div>
    );
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

      {tab === 'pending' && (
        pending.length === 0 ? (
          <EmptyState tabKey="pending" />
        ) : (
          pending.map((p) => (
            <div key={p.paymentId} className="be-card apk-payment-card apk-payment-card--urgent">
              <div className="apk-row-head">
                <div>
                  <div className="apk-fund-name">SIP installment</div>
                  <div className="apk-cell-meta">Due {fmtDate(p.dueDate)} · {p.reason}</div>
                </div>
                <span className="be-badge be-badge-paused"><span className="be-badge-dot" />Pending</span>
              </div>
              <div className="apk-payment-action">
                <div className="apk-row-amount be-money">{fmtMoney(p.amount)}</div>
                <button className="be-btn be-btn-primary be-btn-sm apk-retry-btn" onClick={() => retry(p.orderId)} disabled={retrying === p.orderId}>
                  {retrying === p.orderId ? 'Retrying…' : 'Retry payment now'}
                </button>
              </div>
            </div>
          ))
        )
      )}

      {tab !== 'pending' && (
        items === null ? (
          <>
            {/* Mobile skeleton */}
            <div className="be-card apk-list-card apk-tx-skeleton--mobile">
              {[0,1,2,3,4].map(i => <div key={i} className="apk-skel apk-row-skel" />)}
            </div>
            {/* Desktop skeleton */}
            <div className="be-card apk-list-card apk-tx-skeleton--desktop">
              <div className="apk-tx-table-head apk-skel-table-head">
                <span>Type</span>
                <span>Fund</span>
                <span>Date</span>
                <span className="apk-tx-col-amt">Amount</span>
                <span className="apk-tx-col-status">Status</span>
              </div>
              {[0,1,2,3,4,5].map(i => (
                <div key={i} className="apk-tx-table-row apk-skel-table-row">
                  <div className="apk-skel apk-skel-dot" />
                  <div className="apk-skel apk-skel-line" />
                  <div className="apk-skel apk-skel-line" />
                  <div className="apk-skel apk-skel-line" />
                  <div className="apk-skel apk-skel-pill" />
                </div>
              ))}
            </div>
          </>
        ) : items.length === 0 ? (
          <EmptyState tabKey={tab} />
        ) : (
          <div className="be-card apk-tx-list apk-list-card">
            {/* Mobile list */}
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
                    <div className="apk-tx-name">{t.fundName}</div>
                    <div className="apk-tx-date">{fmtDate(t.date)}</div>
                  </div>
                  <div className="apk-tx-right">
                    <div className="apk-tx-amt be-money">{fmtMoney(t.amount)}</div>
                    <span className={`be-badge apk-tx-status ${statusBadgeClass(t.status)}`}>
                      <span className="be-badge-dot" />{t.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="apk-tx-table">
              <div className="apk-tx-table-head">
                <span>Type</span>
                <span>Fund</span>
                <span>Date</span>
                <span className="apk-tx-col-amt">Amount</span>
                <span className="apk-tx-col-status">Status</span>
              </div>
              {grouped.map((group) => (
                <div key={group.label} className="apk-tx-month-group">
                  <div className="apk-tx-month-header">{group.label}</div>
                  {group.items.map((t, idx) => (
                    <div
                      key={t.id}
                      className={`apk-tx-table-row ${idx % 2 === 1 ? 'is-alt' : ''}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => setOpen(t)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(t); } }}
                    >
                      <span className="apk-tx-table-type">
                        <span className={`apk-tx-dot ${typeDotClass(t.type)}`} />
                        {t.type === 'sip' ? 'SIP' : t.type === 'lumpsum' ? 'Lumpsum' : t.type}
                      </span>
                      <span className="apk-tx-table-fund" title={t.fundName}>{t.fundName}</span>
                      <span className="apk-tx-table-date">{fmtDate(t.date)}</span>
                      <span className="apk-tx-table-amt be-money">{fmtMoney(t.amount)}</span>
                      <span className="apk-tx-table-status">
                        <span className={`be-badge ${statusBadgeClass(t.status)}`}>
                          <span className="be-badge-dot" />{t.status}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )
      )}

      <div className="be-disclosure">{tab === 'pending' ? 'Pending installments are AutoPay attempts that did not complete. Retrying does not double-charge.' : 'Showing last 90 days. Older history is available in Statements. Investment values reflect market pricing.'}</div>

      {open && (
        <div className={`apk-sheet-overlay ${open ? 'is-open' : ''}`} onClick={() => setOpen(null)} role="dialog" aria-modal="true" aria-label="Transaction details">
          <div className="apk-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="apk-sheet-handle" />
            <h2 className="apk-h-sm apk-tx-sheet-title">{open.fundName}</h2>
            <div className="apk-cell-meta apk-sheet-meta">{open.type.toUpperCase()} · {fmtDate(open.date, { withTime: true })}</div>
            <div className="apk-sheet-summary">
              <div className="apk-sheet-summary-row"><span>Amount</span><strong className="be-money">{fmtMoney(open.amount)}</strong></div>
              <div className="apk-sheet-summary-row"><span>Units</span><strong className="be-num">{open.units ? fmtUnits(open.units) : '—'}</strong></div>
              <div className="apk-sheet-summary-row"><span>Mode</span><strong>{open.mode || open.paymentMode || '—'}</strong></div>
              <div className="apk-sheet-summary-row"><span>Reference</span><strong className="be-mono apk-reference">{open.reference || open.referenceId || '—'}</strong></div>
              <div className="apk-sheet-summary-row"><span>Status</span>
                <span className={`be-badge ${statusBadgeClass(open.status)}`}>
                  <span className="be-badge-dot" />{open.status}
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
