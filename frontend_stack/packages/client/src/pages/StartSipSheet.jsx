import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CreditCard } from 'lucide-react';
import AppBar from '../layout/AppBar.jsx';
import * as fundsApi from '../services/fundsApi.js';
import * as ordersApi from '../services/ordersApi.js';
import { useAppConfig } from '../hooks/useAppConfig.js';
import { fmtMoney } from '../utils/format.js';
import { openRazorpayCheckout } from '../utils/razorpay.js';
import { useSession } from '../store/SessionContext.jsx';
import MoneyValue from '@beonedge/shared/components/MoneyValue.jsx';

export default function StartSipSheet() {
  const { fundId } = useParams();
  const navigate = useNavigate();
  const { user } = useSession();
  const appConfig = useAppConfig();
  const settings = appConfig.mobile.screens.invest.sip;
  const [fund, setFund] = useState(null);
  const [amount, setAmount] = useState(settings.defaultAmount ?? '');
  const [months, setMonths] = useState(settings.defaultMonths ?? '');
  const [day, setDay] = useState(settings.defaultDebitDay ?? '');
  const [stepUpOn, setStepUpOn] = useState(false);
  const [stepUpPct, setStepUpPct] = useState(settings.defaultStepUpPct);
  const [c1, setC1] = useState(false);
  const [c2, setC2] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewConsent, setReviewConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { fundsApi.getFund(fundId).then(setFund).catch(() => setFund(null)); }, [fundId, appConfig.publishedAt]);

  if (!fund) return (<><AppBar title="Start SIP" /><div className="apk-screen"><div className="apk-skel" style={{ height: 200 }} /></div></>);

  const minSip = Number(fund.minSip) || 0;
  const minDurationMonths = Number(settings.minDurationMonths) || 0;
  const amountNumber = Number(amount) || 0;
  const monthsNumber = Number(months) || 0;
  const validAmt = amount !== '' && amountNumber >= minSip;
  const validDur = months !== '' && (!minDurationMonths || monthsNumber >= minDurationMonths);
  const validDebitDay = day !== '';
  const canReview = validAmt && validDur && validDebitDay && c1 && c2;
  const canConfirm = reviewConsent && !submitting;
  const disclosures = {
    minimumPrefix: 'Minimum',
    stepUpTitle: 'Increase SIP every year',
    stepUpBody: 'Optional step-up. Default off.',
    riskConsent: 'I have read the Risk disclosure and understand market risk.',
    mandateConsent: 'I authorize BeOnEdge to set up a UPI AutoPay mandate for the recurring debits described above.',
    paymentDisclosure: 'Razorpay checkout opens after review for the first SIP payment and mandate setup.',
    reviewRiskText: '',
    ...(settings.disclosures || {}),
  };
  const amountPresets = normalizeOptions(settings.amountPresets, [minSip, 1000, 2500, 5000, 10000])
    .filter((value) => value >= minSip);
  const durationOptions = normalizeOptions(settings.durationMonths, [12, 24, 36, 60, 120]);
  const debitDayOptions = normalizeOptions(settings.debitDays, [1, 5, 10, 15, 20]);

  const mandateCap = Math.round(amountNumber * 1.5);
  const durationYears = Math.floor(monthsNumber / 12);
  const durationRemainingMonths = monthsNumber % 12;
  const durationText = durationYears > 0
    ? `${monthsNumber} months (${durationYears}${durationRemainingMonths > 0 ? ` yr ${durationRemainingMonths} mo` : ' years'})`
    : `${monthsNumber} months`;
  const debitDayText = day ? `${day}${getOrdinal(day)} of every month` : 'Configured debit day';

  const riskDisclosure = disclosures.reviewRiskText
    || 'Mutual fund investments are subject to market risks. Please read all scheme-related documents carefully before investing. Past performance does not guarantee future returns. Unit values may go up or down depending on the factors and forces affecting the securities market.';

  function normalizeOptions(values, fallback) {
    const source = Array.isArray(values) && values.length ? values : fallback;
    return [...new Set(source.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0))];
  }

  function getOrdinal(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  }

  function onAmountChange(e) {
    const next = e.target.value;
    setAmount(next === '' ? '' : Math.max(0, Math.floor(Number(next))));
  }

  function onContinue() {
    setErr('');
    setReviewMode(true);
    setReviewConsent(false);
  }

  function onBack() {
    setReviewMode(false);
    setReviewConsent(false);
    setErr('');
  }

  async function onConfirm() {
    setErr('');
    setSubmitting(true);
    try {
      const order = await ordersApi.createSip({
        fundId,
        amount: amountNumber,
        frequency: 'monthly',
        durationMonths: monthsNumber,
        debitDay: day,
        stepUp: stepUpOn ? { amount: 0, percent: stepUpPct, frequencyMonths: 12, nextDate: '' } : null,
        consentTextVersion: 'v1.0-2026-05-05',
        consentedAt: new Date().toISOString(),
      });
      if (!order.paymentId) {
        setErr("Couldn't create SIP. Try again.");
        setSubmitting(false);
        return;
      }
      if (order.providerName === 'razorpay' && order.providerOrderId && order.providerKeyId) {
        openRazorpayCheckout({
          keyId: order.providerKeyId,
          orderId: order.providerOrderId,
          amount: order.amount,
          currency: order.currency,
          name: fund.name,
          description: 'SIP Setup',
          userEmail: user?.email || '',
          userContact: user?.phone || '',
          onSuccess: async (response) => {
            await ordersApi.confirmRazorpayPayment(order.paymentId, response);
            navigate('/app/dashboard');
          },
          onFailure: () => {
            navigate(`/app/payment/${order.paymentId}`);
          },
        });
      } else {
        navigate(`/app/payment/${order.paymentId}`);
      }
    } catch (e) {
      const message = e?.message || e?.code || "Couldn't create SIP. Try again.";
      setErr(message);
      setSubmitting(false);
    }
  }

  if (reviewMode) {
    return (
      <>
        <AppBar title="Review SIP" />
        <div className="apk-screen">
          <div className="be-eyebrow">Review your SIP</div>
          <h1 className="apk-h-sm" style={{ marginTop: 6 }}>{fund.name}</h1>
          <p style={{ fontSize: 13, color: 'var(--be-slate)', marginTop: 4, marginBottom: 0 }}>{fund.tagline}</p>

          <div className="be-card-flat" style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="apk-sheet-summary-row"><span>Amount per month</span><strong className="be-money"><MoneyValue amount={amountNumber} source="derived" asOf={new Date().toISOString()} showBadge={false} /></strong></div>
            <div className="apk-sheet-summary-row"><span>Duration</span><strong>{durationText}</strong></div>
            <div className="apk-sheet-summary-row"><span>Debit day</span><strong>{debitDayText}</strong></div>
            {stepUpOn && <div className="apk-sheet-summary-row"><span>Step-up</span><strong>+{stepUpPct}% every 12 months</strong></div>}
            <div className="apk-sheet-summary-row"><span>Mandate cap</span><strong className="be-money"><MoneyValue amount={mandateCap} source="derived" asOf={new Date().toISOString()} showBadge={false} /></strong></div>
          </div>

          <div className="be-disclosure" style={{ marginTop: 14 }}>{riskDisclosure}</div>

          <label className="apk-consent-row" style={{ marginTop: 10 }}>
            <input type="checkbox" checked={reviewConsent} onChange={(e) => setReviewConsent(e.target.checked)} />
            <span>I understand that investments are subject to market risks and have read the scheme-related documents.</span>
          </label>

          {err && <div className="apk-banner apk-banner-red" style={{ marginTop: 10 }}>{err}</div>}

        <div style={{ marginTop: 'auto', paddingTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="be-btn be-btn-primary be-btn-block be-btn-lg" disabled={!canConfirm} onClick={onConfirm}>
              {submitting ? 'Setting up SIP…' : (
                <>
                  <CreditCard size={18} strokeWidth={2} style={{ marginRight: 8 }} /> Continue to Razorpay
                </>
              )}
            </button>
            <button className="be-btn be-btn-secondary be-btn-block be-btn-lg" onClick={onBack} disabled={submitting}>
              Back
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AppBar title="Start SIP" />
      <div className="apk-screen sip-setup-screen">
        <div className="sip-setup-head">
          <div>
            <div className="be-eyebrow">Start SIP</div>
            <h1 className="apk-h-sm">Choose monthly amount</h1>
            <p>{fund.name}</p>
          </div>
          <span className="be-badge be-badge-neutral">Razorpay next</span>
        </div>

        <section className="sip-amount-panel" aria-labelledby="sip-amount-label">
          <div className="sip-amount-head">
            <span id="sip-amount-label">Monthly SIP amount</span>
            <strong>{disclosures.minimumPrefix} {fmtMoney(minSip)}</strong>
          </div>
          <div className="apk-amount-row sip-amount-row">
            <span className="apk-amount-prefix">₹</span>
            <input
              id="sip-amount-input"
              className="apk-amount-input be-money"
              type="number"
              inputMode="numeric"
              min={minSip || 0}
              step="500"
              value={amount}
              onChange={onAmountChange}
              placeholder="0"
              aria-invalid={amount !== '' && !validAmt}
              aria-describedby="sip-amount-help"
            />
          </div>
          <div className="apk-chip-row sip-amount-presets">
            {amountPresets.map((v) => (
              <button key={v} className={'apk-chip' + (amount === v ? ' is-active' : '')} onClick={() => setAmount(v)}>{fmtMoney(v)}</button>
            ))}
          </div>
          {amount !== '' && !validAmt && <div className="be-field-error">Minimum is {fmtMoney(minSip)}.</div>}
          <div className="be-disclosure" id="sip-amount-help">Enter the amount you want debited every month.</div>
        </section>

        <div className="sip-setup-grid">
          <div className="be-field sip-setup-field">
            <label>Duration</label>
            <div className="apk-chip-row">
              {durationOptions.map((m) => (
                <button key={m} className={'apk-chip' + (months === m ? ' is-active' : '')} onClick={() => setMonths(m)}>{m} mo</button>
              ))}
            </div>
            {months !== '' && !validDur && <div className="be-field-error">Minimum SIP duration is {minDurationMonths} months.</div>}
          </div>

          <div className="be-field sip-setup-field">
            <label>Monthly debit date</label>
            <div className="apk-chip-row">
              {debitDayOptions.map((d) => (
                <button key={d} className={'apk-chip' + (day === d ? ' is-active' : '')} onClick={() => setDay(d)}>{d}</button>
              ))}
            </div>
          </div>
        </div>

        {settings.stepUpEnabled && (
          <div className="apk-stepup-toggle" onClick={() => setStepUpOn((v) => !v)} role="button" aria-pressed={stepUpOn}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{disclosures.stepUpTitle}</div>
              <div style={{ fontSize: 12, color: 'var(--be-slate)', marginTop: 2 }}>{disclosures.stepUpBody}</div>
            </div>
            <div className={'apk-toggle' + (stepUpOn ? ' is-on' : '')} />
          </div>
        )}
        {settings.stepUpEnabled && stepUpOn && (
          <div>
            <div className="apk-chip-row">
              {normalizeOptions(settings.stepUpPercents, [5, 10, 15]).map((p) => (
                <button key={p} className={'apk-chip' + (stepUpPct === p ? ' is-active' : '')} onClick={() => setStepUpPct(p)}>{p}%</button>
              ))}
            </div>
            <div className="be-disclosure" style={{ marginTop: 8 }}>Your SIP amount will increase by {stepUpPct}% every 12 months. You can change or cancel this from Profile → Mandates.</div>
          </div>
        )}

        <hr className="be-rule" />

        <label className="apk-consent-row">
          <input type="checkbox" checked={c1} onChange={(e) => setC1(e.target.checked)} />
          <span>{disclosures.riskConsent}</span>
        </label>
        <label className="apk-consent-row">
          <input type="checkbox" checked={c2} onChange={(e) => setC2(e.target.checked)} />
          <span>{disclosures.mandateConsent}</span>
        </label>

        <div className="apk-sheet-summary sip-setup-summary">
          <div className="apk-sheet-summary-row"><span>Monthly SIP</span><strong className="be-money"><MoneyValue amount={amountNumber} source="derived" asOf={new Date().toISOString()} showBadge={false} /></strong></div>
          <div className="apk-sheet-summary-row"><span>Debit schedule</span><strong>{day || 'Configured debit day'} of every month</strong></div>
          <div className="apk-sheet-summary-row"><span>Total over {months || 'configured'} mo</span><strong className="be-money"><MoneyValue amount={amountNumber * monthsNumber} source="derived" asOf={new Date().toISOString()} showBadge={false} /></strong></div>
          <div className="apk-sheet-summary-row"><span>Mandate cap preview</span><strong className="be-money"><MoneyValue amount={mandateCap} source="derived" asOf={new Date().toISOString()} showBadge={false} /></strong></div>
          {stepUpOn && <div className="apk-sheet-summary-row"><span>Step-up</span><strong>+{stepUpPct}% every 12 mo</strong></div>}
          <div className="be-disclosure" style={{ marginTop: 6 }}>{disclosures.paymentDisclosure}</div>
        </div>

        {err && <div className="apk-banner apk-banner-red">{err}</div>}

        <button className="be-btn be-btn-primary be-btn-block be-btn-lg" disabled={!canReview} onClick={onContinue}>
          Review SIP details
        </button>
      </div>
    </>
  );
}
