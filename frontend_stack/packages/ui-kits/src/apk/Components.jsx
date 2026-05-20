import React from 'react';
import logoOnDark from '@beonedge/shared/assets/logo-on-dark.svg';
import logo from '@beonedge/shared/assets/logo.svg';

// =============================================================
// BeOnEdge — Mobile APK kit components
// =============================================================

const APK_W = 412;

// ---------- Top app bar ----------
function ApkAppBar({ title, leftIcon, onLeft, rightIcon, onRight, hairline = true }) {
  return (
    <div className="apk-appbar" style={{ borderBottom: hairline ? '1px solid var(--be-border)' : 'none' }}>
      <button className="apk-appbar-icon" onClick={onLeft} aria-label="back">
        {leftIcon ? <i data-lucide={leftIcon}></i> : <span/>}
      </button>
      <div className="apk-appbar-title">{title}</div>
      <button className="apk-appbar-icon" onClick={onRight} aria-label="action">
        {rightIcon ? <i data-lucide={rightIcon}></i> : <span/>}
      </button>
    </div>
  );
}

// ---------- Bottom tab bar ----------
function ApkBottomNav({ active, onChange }) {
  const tabs = [
    { id: 'home',  label: 'Home',     icon: 'home' },
    { id: 'explore', label: 'Explore', icon: 'compass' },
    { id: 'portfolio', label: 'Portfolio', icon: 'pie-chart' },
    { id: 'tx',    label: 'Transactions', icon: 'receipt' },
    { id: 'me',    label: 'Profile',  icon: 'user' },
  ];
  return (
    <div className="apk-tabbar">
      {tabs.map(t => (
        <button
          key={t.id}
          className={`apk-tab ${active === t.id ? 'is-active' : ''}`}
          onClick={() => onChange(t.id)}
        >
          <i data-lucide={t.icon}></i>
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

// ---------- Splash ----------
function ApkSplash() {
  return (
    <div className="apk-splash">
      <img src={logoOnDark} width="160" alt="BeOnEdge"/>
      <div className="apk-splash-disc">Investments are subject to market risk.</div>
      <div className="apk-splash-spinner"><span/></div>
    </div>
  );
}

// ---------- Login ----------
function ApkLogin({ onLogin }) {
  return (
    <div className="apk-screen apk-login">
      <div className="apk-login-brand">
        <img src={logo} width="160" alt="BeOnEdge"/>
      </div>
      <h2 className="apk-login-title">Welcome back.</h2>
      <p className="apk-login-sub">Sign in to your approved BeOnEdge account.</p>
      <div className="be-field"><label>Email or phone</label><input className="be-input" defaultValue="aanya@example.in"/></div>
      <div className="be-field"><label>Password</label><input className="be-input" type="password" defaultValue="••••••••"/></div>
      <button className="be-btn be-btn-primary be-btn-block be-btn-lg" onClick={onLogin}>Sign in</button>
      <div className="apk-login-foot">
        <a href="#">Forgot password</a>
        <span>·</span>
        <a href="#">Need to onboard? Visit web</a>
      </div>
      <p className="be-disclosure apk-login-disc">Account creation is web-only. Once approved, sign in here.</p>
    </div>
  );
}

// ---------- Dashboard ----------
function ApkDashboard({ onOpenFund, onTab }) {
  return (
    <div className="apk-screen">
      <div className="apk-greet">
        <span className="be-eyebrow">Good evening</span>
        <h2 className="apk-greet-name">Aanya</h2>
      </div>

      <div className="apk-portfolio be-card">
        <div className="be-eyebrow">Current value</div>
        <div className="apk-portfolio-num">₹2,48,562</div>
        <div className="apk-portfolio-delta">
          <span className="be-num be-gain">+₹12,840</span>
          <span className="be-num be-gain">+5.45%</span>
          <span className="apk-portfolio-tag">All-time</span>
        </div>
        <div className="apk-portfolio-row">
          <div><div className="be-eyebrow">Invested</div><div className="be-money">₹2,35,722</div></div>
          <div><div className="be-eyebrow">XIRR</div><div className="be-money be-gain">+11.3%</div></div>
          <div><div className="be-eyebrow">Today</div><div className="be-money be-loss">−₹486</div></div>
        </div>
        <p className="be-disclosure apk-portfolio-disc">As of 28 Apr 2026, 6:00 PM IST · Admin published</p>
      </div>

      <div className="apk-section-head">
        <span className="be-eyebrow">Active SIPs</span>
        <a className="apk-link" href="#" onClick={(e) => { e.preventDefault(); onTab('portfolio'); }}>View all</a>
      </div>

      <div className="be-card apk-sip">
        <div className="apk-sip-head">
          <div>
            <div className="apk-sip-name">BeOnEdge Growth Fund</div>
            <div className="apk-sip-meta">₹5,000 · 5th of every month</div>
          </div>
          <span className="be-badge be-badge-active"><span className="be-badge-dot"/>Active</span>
        </div>
        <div className="apk-sip-row">
          <div><div className="be-eyebrow">Next debit</div><div className="be-money">5 May 2026</div></div>
          <div><div className="be-eyebrow">Mandate</div><div className="be-money">UPI AutoPay</div></div>
        </div>
      </div>

      <div className="apk-quick">
        <button className="apk-quick-btn" onClick={() => onTab('explore')}>
          <i data-lucide="trending-up"></i><span>Start SIP</span>
        </button>
        <button className="apk-quick-btn" onClick={() => onTab('explore')}>
          <i data-lucide="banknote"></i><span>One-time</span>
        </button>
        <button className="apk-quick-btn" onClick={() => onTab('tx')}>
          <i data-lucide="receipt"></i><span>History</span>
        </button>
        <button className="apk-quick-btn" onClick={onOpenFund}>
          <i data-lucide="line-chart"></i><span>Funds</span>
        </button>
      </div>

      <div className="apk-section-head">
        <span className="be-eyebrow">Market · 5-min delayed</span>
      </div>
      <div className="be-card apk-pulse">
        <div className="apk-pulse-row"><span>Nifty 50</span><span className="be-money">22,418.40</span><span className="be-num be-gain">+0.42%</span></div>
        <div className="apk-pulse-row"><span>Sensex</span><span className="be-money">73,872.16</span><span className="be-num be-gain">+0.38%</span></div>
        <div className="apk-pulse-row"><span>Nifty Bank</span><span className="be-money">47,210.05</span><span className="be-num be-loss">−0.18%</span></div>
      </div>
    </div>
  );
}

// ---------- Explore ----------
function ApkExplore({ onOpenFund }) {
  return (
    <div className="apk-screen">
      <h2 className="apk-h">Explore</h2>
      <div className="apk-search">
        <i data-lucide="search"></i>
        <input placeholder="Search funds, products, or symbols"/>
      </div>

      <span className="be-eyebrow apk-section-eyebrow">BeOnEdge Products</span>

      <button className="be-card apk-fund" onClick={onOpenFund}>
        <div className="apk-fund-head">
          <div className="apk-fund-name">BeOnEdge Growth Fund</div>
          <span className="be-badge be-badge-active"><span className="be-badge-dot"/>Open</span>
        </div>
        <div className="apk-fund-tag">Equity-led model portfolio · Moderate-High risk</div>
        <svg viewBox="0 0 360 60" className="apk-fund-spark">
          <polyline fill="none" stroke="#0E1116" strokeWidth="1.5"
            points="0,48 36,44 72,52 108,54 144,46 180,34 216,28 252,38 288,22 324,14 360,6"/>
        </svg>
        <div className="apk-fund-foot">
          <div><div className="be-eyebrow">5Y CAGR</div><div className="be-money be-gain">+18.4%</div></div>
          <div><div className="be-eyebrow">Min SIP</div><div className="be-money">₹500</div></div>
          <div><div className="be-eyebrow">Min lumpsum</div><div className="be-money">₹5,000</div></div>
        </div>
      </button>

      <div className="be-card apk-fund apk-fund-soon">
        <div className="apk-fund-head">
          <div className="apk-fund-name">BeOnEdge Static Fund</div>
          <span className="be-badge be-badge-gold">Coming soon</span>
        </div>
        <div className="apk-fund-tag">Lower-risk static portfolio</div>
      </div>

      <div className="be-card apk-fund apk-fund-soon">
        <div className="apk-fund-head">
          <div className="apk-fund-name">BeOnEdge Algo-Trade Fund</div>
          <span className="be-badge be-badge-gold">Coming soon</span>
        </div>
        <div className="apk-fund-tag">Programmatic strategies · Backed by reviewed analytics</div>
      </div>
    </div>
  );
}

// ---------- Fund detail ----------
function ApkFundDetail({ onBack, onStartSip, onLumpsum }) {
  return (
    <div className="apk-screen apk-no-pad">
      <ApkAppBar title="Fund detail" leftIcon="arrow-left" onLeft={onBack} rightIcon="share" />
      <div className="apk-pad">
        <span className="be-eyebrow">BeOnEdge · Flagship</span>
        <h2 className="apk-fund-detail-name">BeOnEdge Growth Fund</h2>
        <div className="apk-fund-detail-tag">Equity-led model portfolio · Recommended horizon 5 yr+</div>

        <div className="be-card apk-perf">
          <div className="apk-perf-head">
            <div>
              <div className="be-eyebrow">NAV</div>
              <div className="apk-perf-nav be-money">₹128.42</div>
            </div>
            <div className="apk-perf-tabs">
              <button className="is-active">5Y</button>
              <button>10Y</button>
            </div>
          </div>
          <svg viewBox="0 0 360 140" className="apk-perf-chart">
            <line x1="0" y1="36" x2="360" y2="36" stroke="#5C6470" strokeOpacity="0.15"/>
            <line x1="0" y1="72" x2="360" y2="72" stroke="#5C6470" strokeOpacity="0.15"/>
            <line x1="0" y1="108" x2="360" y2="108" stroke="#5C6470" strokeOpacity="0.15"/>
            <path d="M 0 100 L 36 95 L 72 108 L 108 118 L 144 110 L 180 90 L 216 78 L 252 96 L 288 80 L 324 60 L 360 44 L 360 140 L 0 140 Z" fill="#B43A2E" fillOpacity="0.06"/>
            <polyline fill="none" stroke="#0E1116" strokeWidth="1.5"
              points="0,108 36,102 72,114 108,124 144,114 180,88 216,74 252,98 288,80 324,60 360,42"/>
          </svg>
          <div className="apk-perf-stats">
            <div><div className="be-eyebrow">5Y CAGR</div><div className="be-money be-gain">+18.4%</div></div>
            <div><div className="be-eyebrow">Max DD</div><div className="be-money">−14.2%</div></div>
            <div><div className="be-eyebrow">Sharpe</div><div className="be-money">0.84</div></div>
          </div>
          <p className="be-disclosure">Past performance does not guarantee future returns. Admin published 28 Apr 2026.</p>
        </div>

        <div className="be-card apk-alloc">
          <div className="be-eyebrow">Asset allocation</div>
          <div className="apk-alloc-row">
            <svg viewBox="0 0 100 100" width="92" height="92">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#EFE9DB" strokeWidth="12"/>
              <circle cx="50" cy="50" r="40" fill="none" stroke="#0E1116" strokeWidth="12"
                      strokeDasharray="237 251" strokeDashoffset="62" transform="rotate(-90 50 50)"/>
              <circle cx="50" cy="50" r="40" fill="none" stroke="#B5894A" strokeWidth="12"
                      strokeDasharray="11 251" strokeDashoffset="-180" transform="rotate(-90 50 50)"/>
            </svg>
            <div className="apk-alloc-legend">
              <div className="apk-alloc-row-item"><span className="apk-alloc-sw" style={{background:'#0E1116'}}/><span>Equity</span><span className="be-money">95.0%</span></div>
              <div className="apk-alloc-row-item"><span className="apk-alloc-sw" style={{background:'#B5894A'}}/><span>Cash & equivalents</span><span className="be-money">5.0%</span></div>
            </div>
          </div>
        </div>

        <div className="be-card apk-holdings">
          <div className="apk-section-head" style={{margin:'0 0 8px'}}>
            <div className="be-eyebrow">Top holdings</div>
            <a className="apk-link" href="#">View all 24</a>
          </div>
          {[
            { sym: 'TCS', name: 'Tata Consultancy Services', pct: '8.4%' },
            { sym: 'HDFCBANK', name: 'HDFC Bank', pct: '7.8%' },
            { sym: 'INFY', name: 'Infosys', pct: '6.2%' },
            { sym: 'RELIANCE', name: 'Reliance Industries', pct: '5.9%' },
            { sym: 'ICICIBANK', name: 'ICICI Bank', pct: '4.7%' },
          ].map(h => (
            <div className="apk-holding" key={h.sym}>
              <div>
                <div className="apk-holding-sym">{h.sym}</div>
                <div className="apk-holding-name">{h.name}</div>
              </div>
              <div className="be-money">{h.pct}</div>
            </div>
          ))}
        </div>

        <p className="be-disclosure apk-fund-detail-disc">BeOnEdge Growth Fund is a model portfolio. Holdings rebalance per the published methodology. Not advisory specific to your portfolio. Read the full disclosure before investing.</p>
      </div>

      <div className="apk-action-bar">
        <button className="be-btn be-btn-secondary be-btn-block" onClick={onLumpsum}>One-time</button>
        <button className="be-btn be-btn-primary be-btn-block" onClick={onStartSip}>Start SIP</button>
      </div>
    </div>
  );
}

// ---------- Start SIP sheet ----------
function ApkStartSipSheet({ open, onClose, onConfirm }) {
  const [amount, setAmount] = React.useState(5000);
  const [duration, setDuration] = React.useState(36);
  const [day, setDay] = React.useState(5);
  if (!open) return null;
  return (
    <div className="apk-sheet-overlay" onClick={onClose}>
      <div className="apk-sheet" onClick={e => e.stopPropagation()}>
        <div className="apk-sheet-handle"/>
        <span className="be-eyebrow">Start SIP</span>
        <h3 className="apk-sheet-title">BeOnEdge Growth Fund</h3>

        <div className="apk-sheet-amount">
          <span>₹</span>
          <input type="number" value={amount} onChange={e => setAmount(+e.target.value)} className="be-num"/>
        </div>
        <div className="apk-amount-quick">
          {[500, 1000, 5000, 10000, 25000].map(v => (
            <button key={v} className={`apk-chip ${amount === v ? 'is-active' : ''}`} onClick={() => setAmount(v)}>₹{v.toLocaleString('en-IN')}</button>
          ))}
        </div>
        <div className="be-disclosure" style={{marginTop:8}}>Minimum ₹500 · Admin override possible</div>

        <div className="apk-sheet-row">
          <label>Duration</label>
          <div className="apk-chip-group">
            {[12, 24, 36, 60].map(v => (
              <button key={v} className={`apk-chip ${duration === v ? 'is-active' : ''}`} onClick={() => setDuration(v)}>{v} mo</button>
            ))}
          </div>
        </div>
        <div className="apk-sheet-row">
          <label>Monthly debit date</label>
          <div className="apk-chip-group">
            {[1, 5, 10, 15, 25].map(v => (
              <button key={v} className={`apk-chip ${day === v ? 'is-active' : ''}`} onClick={() => setDay(v)}>{v}</button>
            ))}
          </div>
        </div>

        <div className="apk-sheet-summary">
          <div className="apk-sheet-summary-row"><span>First payment</span><span className="be-money">₹{amount.toLocaleString('en-IN')}</span></div>
          <div className="apk-sheet-summary-row"><span>Recurring</span><span className="be-money">{day} of every month</span></div>
          <div className="apk-sheet-summary-row"><span>Total over {duration} mo</span><span className="be-money">₹{(amount*duration).toLocaleString('en-IN')}</span></div>
        </div>

        <p className="be-disclosure" style={{margin:'8px 0 14px'}}>First payment uses UPI. Recurring debits require a UPI AutoPay mandate, which you'll authorize next.</p>

        <button className="be-btn be-btn-primary be-btn-block be-btn-lg" onClick={onConfirm}>Continue to payment</button>
      </div>
    </div>
  );
}

// ---------- Transactions ----------
function ApkTransactions() {
  const tx = [
    { date: '5 Apr 2026', type: 'SIP', fund: 'Growth Fund', amount: '₹5,000', status: 'success' },
    { date: '5 Mar 2026', type: 'SIP', fund: 'Growth Fund', amount: '₹5,000', status: 'success' },
    { date: '12 Feb 2026', type: 'Lumpsum', fund: 'Growth Fund', amount: '₹50,000', status: 'success' },
    { date: '5 Feb 2026', type: 'SIP', fund: 'Growth Fund', amount: '₹5,000', status: 'failed' },
    { date: '5 Jan 2026', type: 'SIP', fund: 'Growth Fund', amount: '₹5,000', status: 'success' },
  ];
  const badge = s => s === 'success'
    ? <span className="be-badge be-badge-active"><span className="be-badge-dot"/>Success</span>
    : <span className="be-badge be-badge-failed"><span className="be-badge-dot"/>Failed</span>;
  return (
    <div className="apk-screen">
      <h2 className="apk-h">Transactions</h2>
      <div className="apk-tabs">
        <button className="is-active">All</button>
        <button>SIP</button>
        <button>Lumpsum</button>
        <button>Pending</button>
      </div>
      <div className="be-card apk-tx-list">
        {tx.map((t, i) => (
          <div className="apk-tx" key={i}>
            <div>
              <div className="apk-tx-line">
                <span className="apk-tx-type">{t.type}</span>
                <span className="apk-tx-fund">· {t.fund}</span>
              </div>
              <div className="apk-tx-date">{t.date}</div>
            </div>
            <div className="apk-tx-amount">
              <div className="be-money">{t.amount}</div>
              {badge(t.status)}
            </div>
          </div>
        ))}
      </div>
      <p className="be-disclosure" style={{textAlign:'center',marginTop:14}}>Showing last 90 days · Older history available in Statements</p>
    </div>
  );
}

// ---------- Profile ----------
function ApkProfile({ onLogout }) {
  return (
    <div className="apk-screen">
      <h2 className="apk-h">Profile</h2>
      <div className="be-card apk-profile-id">
        <div className="apk-avatar">AS</div>
        <div>
          <div className="apk-profile-name">Aanya Sharma</div>
          <div className="apk-profile-meta">aanya@example.in · +91 98••• ••342</div>
        </div>
      </div>

      <div className="apk-section-head"><span className="be-eyebrow">Account</span></div>
      <div className="be-card apk-list">
        <div className="apk-list-item"><span><i data-lucide="shield-check"/>KYC status</span><span className="be-badge be-badge-active"><span className="be-badge-dot"/>Approved</span></div>
        <div className="apk-list-item"><span><i data-lucide="line-chart"/>Risk profile</span><span className="apk-list-meta">Moderate · Reviewed Mar 2026</span></div>
        <div className="apk-list-item"><span><i data-lucide="credit-card"/>Bank · UPI</span><span className="apk-list-meta">HDFC ••••8214 / aanya@hdfc</span></div>
        <div className="apk-list-item"><span><i data-lucide="users"/>Nominee</span><span className="apk-list-meta">Add</span></div>
      </div>

      <div className="apk-section-head"><span className="be-eyebrow">Mandates</span></div>
      <div className="be-card apk-list">
        <div className="apk-list-item"><span><i data-lucide="repeat"/>Growth Fund SIP · ₹5,000</span><span className="be-badge be-badge-active"><span className="be-badge-dot"/>Active</span></div>
      </div>

      <div className="apk-section-head"><span className="be-eyebrow">Settings</span></div>
      <div className="be-card apk-list">
        <div className="apk-list-item"><span><i data-lucide="bell"/>Notifications</span><i data-lucide="chevron-right" className="apk-list-chev"/></div>
        <div className="apk-list-item"><span><i data-lucide="lock"/>Security & PIN</span><i data-lucide="chevron-right" className="apk-list-chev"/></div>
        <div className="apk-list-item"><span><i data-lucide="file-text"/>Statements</span><i data-lucide="chevron-right" className="apk-list-chev"/></div>
        <div className="apk-list-item"><span><i data-lucide="life-buoy"/>Support</span><i data-lucide="chevron-right" className="apk-list-chev"/></div>
        <div className="apk-list-item"><span><i data-lucide="scale"/>Legal & disclosures</span><i data-lucide="chevron-right" className="apk-list-chev"/></div>
      </div>

      <button className="be-btn be-btn-ghost be-btn-block apk-logout" onClick={onLogout}>Sign out</button>
      <p className="be-disclosure" style={{textAlign:'center',marginTop:8}}>BeOnEdge · v1.0.0 · build 2026.04.28</p>
    </div>
  );
}

export {
  APK_W,
  ApkAppBar, ApkBottomNav, ApkSplash, ApkLogin,
  ApkDashboard, ApkExplore, ApkFundDetail, ApkStartSipSheet,
  ApkTransactions, ApkProfile,
};
