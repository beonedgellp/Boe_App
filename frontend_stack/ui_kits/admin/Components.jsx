/* global React */
const { useState } = React;

function AdminSidebar({ active, onChange }) {
  const groups = [
    { title: 'Operations', items: [
      { id: 'approvals', label: 'User approvals', icon: 'user-check', count: 12 },
      { id: 'kyc',       label: 'KYC review',     icon: 'shield-check', count: 4 },
      { id: 'risk',      label: 'Risk profiles',  icon: 'line-chart' },
    ]},
    { title: 'Products', items: [
      { id: 'funds',     label: 'Fund CMS',       icon: 'layers' },
      { id: 'nav',       label: 'NAV & performance', icon: 'trending-up' },
      { id: 'holdings',  label: 'Holdings',       icon: 'pie-chart' },
    ]},
    { title: 'Money', items: [
      { id: 'payments',  label: 'Payments',       icon: 'credit-card' },
      { id: 'mandates',  label: 'Mandates',       icon: 'repeat' },
      { id: 'ledger',    label: 'Ledger',         icon: 'book-open' },
      { id: 'requests',  label: 'SIP control',    icon: 'inbox', count: 3 },
    ]},
    { title: 'System', items: [
      { id: 'support',   label: 'Support tickets', icon: 'life-buoy' },
      { id: 'audit',     label: 'Audit log',       icon: 'history' },
      { id: 'env',       label: 'Environment',     icon: 'settings' },
    ]},
  ];
  return (
    <aside className="adm-side">
      <div className="adm-brand">
        <img src="../../assets/logo.svg" height="22" alt="BeOnEdge"/>
        <span className="adm-brand-tag">ADMIN</span>
      </div>
      <nav>
        {groups.map(g => (
          <div className="adm-side-group" key={g.title}>
            <div className="adm-side-title">{g.title}</div>
            {g.items.map(it => (
              <button
                key={it.id}
                className={`adm-side-item ${active === it.id ? 'is-active' : ''}`}
                onClick={() => onChange(it.id)}
              >
                <i data-lucide={it.icon}></i>
                <span>{it.label}</span>
                {it.count != null && <span className="adm-side-count">{it.count}</span>}
              </button>
            ))}
          </div>
        ))}
      </nav>
      <div className="adm-side-foot">
        <div className="adm-env">
          <span className="be-badge be-badge-active"><span className="be-badge-dot"/>Production</span>
        </div>
        <div className="adm-side-user">
          <div className="adm-avatar">KS</div>
          <div>
            <div className="adm-side-user-name">Karan Shah</div>
            <div className="adm-side-user-role">Operations</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function AdminTopBar({ title, breadcrumbs }) {
  return (
    <header className="adm-top">
      <div>
        <div className="adm-bread">
          {breadcrumbs.map((b, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="adm-bread-sep">/</span>}
              <span className={i === breadcrumbs.length - 1 ? 'is-active' : ''}>{b}</span>
            </React.Fragment>
          ))}
        </div>
        <h1 className="adm-top-title">{title}</h1>
      </div>
      <div className="adm-top-actions">
        <button className="adm-icon-btn"><i data-lucide="search"></i></button>
        <button className="adm-icon-btn"><i data-lucide="bell"></i><span className="adm-icon-dot"/></button>
        <div className="adm-divider"/>
        <span className="be-disclosure">28 Apr 2026 · 18:42 IST</span>
      </div>
    </header>
  );
}

function StatTile({ label, value, delta, deltaTone, hint }) {
  return (
    <div className="adm-stat">
      <div className="be-eyebrow">{label}</div>
      <div className="adm-stat-value be-money">{value}</div>
      {delta && <div className={`adm-stat-delta be-num ${deltaTone || ''}`}>{delta}</div>}
      {hint && <div className="adm-stat-hint">{hint}</div>}
    </div>
  );
}

function ApprovalsScreen() {
  const rows = [
    { name: 'Aanya Sharma', email: 'aanya@example.in', applied: '28 Apr · 14:22', risk: 'Moderate', kyc: 'pending', flag: null },
    { name: 'Rohan Mehta', email: 'rohan.mehta@gmail.com', applied: '28 Apr · 12:10', risk: 'Aggressive', kyc: 'approved', flag: null },
    { name: 'Priya Iyer', email: 'priya.i@outlook.com', applied: '27 Apr · 19:48', risk: 'Conservative', kyc: 'pending', flag: 'Aadhaar mismatch' },
    { name: 'Vikram Rao', email: 'vikram@protonmail.com', applied: '27 Apr · 11:02', risk: 'Moderate', kyc: 'approved', flag: null },
    { name: 'Sneha Kulkarni', email: 'snehak@yahoo.in', applied: '26 Apr · 16:31', risk: 'Aggressive', kyc: 'approved', flag: null },
    { name: 'Arjun Pillai', email: 'arjun.pillai@gmail.com', applied: '26 Apr · 09:14', risk: 'Moderate', kyc: 'pending', flag: null },
  ];
  return (
    <div className="adm-screen">
      <div className="adm-stats">
        <StatTile label="Pending approvals" value="12" hint="6 over 24 hr SLA"/>
        <StatTile label="Approved this week" value="38" delta="+12%" deltaTone="be-gain"/>
        <StatTile label="Rejected this week" value="3" delta="−1" deltaTone="be-loss"/>
        <StatTile label="Avg. review time" value="4h 12m" hint="Target: 6h"/>
      </div>
      <div className="adm-card adm-table">
        <div className="adm-card-head">
          <div>
            <span className="be-eyebrow">Pending Queue</span>
            <h3 className="adm-card-title">Awaiting approval</h3>
          </div>
          <div className="adm-card-actions">
            <button className="be-btn be-btn-secondary be-btn-sm">Filter</button>
            <button className="be-btn be-btn-secondary be-btn-sm">Export CSV</button>
          </div>
        </div>
        <table>
          <thead><tr>
            <th><input type="checkbox"/></th>
            <th>User</th><th>Applied</th><th>Risk</th><th>KYC</th><th>Notes</th><th></th>
          </tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.email}>
                <td><input type="checkbox"/></td>
                <td>
                  <div className="adm-user">
                    <div className="adm-avatar adm-avatar-sm">{r.name.split(' ').map(s => s[0]).join('')}</div>
                    <div>
                      <div>{r.name}</div>
                      <div className="adm-cell-meta">{r.email}</div>
                    </div>
                  </div>
                </td>
                <td className="be-num">{r.applied}</td>
                <td>{r.risk}</td>
                <td>
                  {r.kyc === 'approved'
                    ? <span className="be-badge be-badge-active"><span className="be-badge-dot"/>Approved</span>
                    : <span className="be-badge be-badge-paused"><span className="be-badge-dot"/>Pending</span>}
                </td>
                <td>{r.flag ? <span className="adm-flag">{r.flag}</span> : <span className="adm-cell-meta">—</span>}</td>
                <td className="adm-cell-actions">
                  <button className="be-btn be-btn-secondary be-btn-sm">Review</button>
                  <button className="be-btn be-btn-primary be-btn-sm">Approve</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FundsScreen() {
  const funds = [
    { name: 'BeOnEdge Growth Fund', type: 'fund_style_product', status: 'published', minSip: '₹500', minLump: '₹5,000', aum: '₹148.2 Cr', risk: 'Moderate-High' },
    { name: 'BeOnEdge Static Fund', type: 'fund_style_product', status: 'coming_soon', minSip: '₹500', minLump: '₹10,000', aum: '—', risk: 'Conservative' },
    { name: 'BeOnEdge Algo-Trade Fund', type: 'fund_style_product', status: 'draft', minSip: '₹1,000', minLump: '₹25,000', aum: '—', risk: 'High' },
  ];
  const statusBadge = s => {
    if (s === 'published') return <span className="be-badge be-badge-active"><span className="be-badge-dot"/>Published</span>;
    if (s === 'coming_soon') return <span className="be-badge be-badge-gold">Coming soon</span>;
    return <span className="be-badge be-badge-neutral"><span className="be-badge-dot"/>Draft</span>;
  };
  return (
    <div className="adm-screen">
      <div className="adm-grid-2">
        <div className="adm-card">
          <div className="adm-card-head">
            <div>
              <span className="be-eyebrow">BeOnEdge Growth Fund · 5Y</span>
              <h3 className="adm-card-title">Performance preview</h3>
            </div>
            <div className="adm-card-actions">
              <button className="be-btn be-btn-secondary be-btn-sm">Upload NAV</button>
              <button className="be-btn be-btn-primary be-btn-sm">Publish update</button>
            </div>
          </div>
          <svg viewBox="0 0 600 200" width="100%" height="200">
            <line x1="0" y1="50" x2="600" y2="50" stroke="#5C6470" strokeOpacity="0.15"/>
            <line x1="0" y1="100" x2="600" y2="100" stroke="#5C6470" strokeOpacity="0.15"/>
            <line x1="0" y1="150" x2="600" y2="150" stroke="#5C6470" strokeOpacity="0.15"/>
            <path d="M 0 140 L 60 130 L 120 150 L 180 168 L 240 154 L 300 120 L 360 100 L 420 130 L 480 105 L 540 78 L 600 56 L 600 200 L 0 200 Z" fill="#B43A2E" fillOpacity="0.06"/>
            <polyline fill="none" stroke="#5C6470" strokeWidth="1" strokeDasharray="4 4" points="0,150 60,144 120,156 180,170 240,160 300,134 360,118 420,142 480,120 540,98 600,82"/>
            <polyline fill="none" stroke="#0E1116" strokeWidth="1.5" strokeLinejoin="round" points="0,148 60,138 120,156 180,170 240,154 300,118 360,98 420,128 480,104 540,72 600,48"/>
          </svg>
          <div className="adm-stats" style={{marginTop: 8}}>
            <StatTile label="Latest NAV" value="₹128.42" hint="As of 28 Apr 2026"/>
            <StatTile label="5Y CAGR" value="+18.4%" deltaTone="be-gain"/>
            <StatTile label="Max drawdown" value="−14.2%"/>
            <StatTile label="Sharpe" value="0.84"/>
          </div>
        </div>
        <div className="adm-card">
          <span className="be-eyebrow">Allocation · As of 28 Apr 2026</span>
          <h3 className="adm-card-title">Asset breakdown</h3>
          <div style={{display:'flex',gap:24,alignItems:'center',marginTop:12}}>
            <svg viewBox="0 0 100 100" width="120" height="120">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#EFE9DB" strokeWidth="12"/>
              <circle cx="50" cy="50" r="40" fill="none" stroke="#0E1116" strokeWidth="12" strokeDasharray="237 251" strokeDashoffset="62" transform="rotate(-90 50 50)"/>
              <circle cx="50" cy="50" r="40" fill="none" stroke="#B5894A" strokeWidth="12" strokeDasharray="11 251" strokeDashoffset="-180" transform="rotate(-90 50 50)"/>
            </svg>
            <div style={{flex:1}}>
              <div className="adm-alloc"><span className="adm-sw" style={{background:'#0E1116'}}/><span>Equity</span><span className="be-money">95.0%</span></div>
              <div className="adm-alloc"><span className="adm-sw" style={{background:'#B5894A'}}/><span>Cash & equivalents</span><span className="be-money">5.0%</span></div>
            </div>
          </div>
          <div className="adm-card-divider"/>
          <span className="be-eyebrow">Top holdings</span>
          {[['TCS','8.4%'],['HDFCBANK','7.8%'],['INFY','6.2%'],['RELIANCE','5.9%']].map(([s,p]) => (
            <div className="adm-list-row" key={s}><span className="be-mono" style={{fontFamily:'var(--be-font-mono)',fontSize:12}}>{s}</span><span className="be-money">{p}</span></div>
          ))}
        </div>
      </div>
      <div className="adm-card adm-table">
        <div className="adm-card-head">
          <div>
            <span className="be-eyebrow">Catalog</span>
            <h3 className="adm-card-title">Fund CMS</h3>
          </div>
          <div className="adm-card-actions">
            <button className="be-btn be-btn-primary be-btn-sm"><i data-lucide="plus" style={{width:14,height:14}}/>New product</button>
          </div>
        </div>
        <table>
          <thead><tr>
            <th>Fund</th><th>Type</th><th>Status</th><th>Min SIP</th><th>Min lumpsum</th><th>Risk</th><th>AUM</th><th></th>
          </tr></thead>
          <tbody>
            {funds.map(f => (
              <tr key={f.name}>
                <td><span style={{fontFamily:'var(--be-font-serif)',fontSize:15,fontWeight:600}}>{f.name}</span></td>
                <td><code className="adm-code">{f.type}</code></td>
                <td>{statusBadge(f.status)}</td>
                <td className="be-money">{f.minSip}</td>
                <td className="be-money">{f.minLump}</td>
                <td>{f.risk}</td>
                <td className="be-money">{f.aum}</td>
                <td className="adm-cell-actions">
                  <button className="be-btn be-btn-secondary be-btn-sm">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PaymentsScreen() {
  const rows = [
    { id: 'PAY-2026-04-2891', user: 'Aanya Sharma', amount: '₹5,000', mode: 'UPI AutoPay', provider: 'Razorpay', status: 'success', time: '28 Apr · 09:01' },
    { id: 'PAY-2026-04-2890', user: 'Rohan Mehta', amount: '₹50,000', mode: 'UPI', provider: 'Razorpay', status: 'pending', time: '28 Apr · 08:42' },
    { id: 'PAY-2026-04-2888', user: 'Priya Iyer', amount: '₹2,000', mode: 'UPI AutoPay', provider: 'Razorpay', status: 'failed', time: '28 Apr · 02:15' },
    { id: 'PAY-2026-04-2884', user: 'Vikram Rao', amount: '₹10,000', mode: 'Netbanking', provider: 'Razorpay', status: 'success', time: '27 Apr · 22:08' },
    { id: 'PAY-2026-04-2880', user: 'Sneha Kulkarni', amount: '₹5,000', mode: 'UPI AutoPay', provider: 'Razorpay', status: 'reconciled', time: '27 Apr · 09:01' },
  ];
  const sb = s => ({
    success: <span className="be-badge be-badge-active"><span className="be-badge-dot"/>Success</span>,
    pending: <span className="be-badge be-badge-paused"><span className="be-badge-dot"/>Pending</span>,
    failed:  <span className="be-badge be-badge-failed"><span className="be-badge-dot"/>Failed</span>,
    reconciled: <span className="be-badge be-badge-neutral"><span className="be-badge-dot"/>Reconciled</span>,
  }[s]);
  return (
    <div className="adm-screen">
      <div className="adm-stats">
        <StatTile label="Today · processed" value="₹14,82,000" delta="+8%" deltaTone="be-gain"/>
        <StatTile label="Pending" value="6" hint="₹62,000 across 6 orders"/>
        <StatTile label="Failed (24h)" value="3" delta="−2" deltaTone="be-gain"/>
        <StatTile label="Reconciled" value="98.4%"/>
      </div>
      <div className="adm-card adm-table">
        <div className="adm-card-head">
          <div>
            <span className="be-eyebrow">Ledger · Last 24 hours</span>
            <h3 className="adm-card-title">Payment activity</h3>
          </div>
          <div className="adm-card-actions">
            <button className="be-btn be-btn-secondary be-btn-sm">Reconcile</button>
            <button className="be-btn be-btn-secondary be-btn-sm">Export</button>
          </div>
        </div>
        <table>
          <thead><tr>
            <th>Reference</th><th>User</th><th>Amount</th><th>Mode</th><th>Provider</th><th>Status</th><th>Time</th><th></th>
          </tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td><code className="adm-code">{r.id}</code></td>
                <td>{r.user}</td>
                <td className="be-money">{r.amount}</td>
                <td>{r.mode}</td>
                <td>{r.provider}</td>
                <td>{sb(r.status)}</td>
                <td className="be-num adm-cell-meta">{r.time}</td>
                <td className="adm-cell-actions">
                  <button className="be-btn be-btn-ghost be-btn-sm"><i data-lucide="more-horizontal" style={{width:14,height:14}}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MandatesScreen() {
  const rows = [
    { id: 'MND-771', user: 'Aanya Sharma', amount: '₹5,000', day: 5, status: 'active', last: '5 Apr · success', next: '5 May 2026' },
    { id: 'MND-770', user: 'Rohan Mehta', amount: '₹10,000', day: 1, status: 'pending_user_auth', last: '—', next: 'Awaiting auth' },
    { id: 'MND-768', user: 'Priya Iyer', amount: '₹2,000', day: 15, status: 'paused', last: '15 Mar · paused', next: 'On resume' },
    { id: 'MND-765', user: 'Vikram Rao', amount: '₹15,000', day: 25, status: 'active', last: '25 Apr · success', next: '25 May 2026' },
  ];
  const sb = s => ({
    active: <span className="be-badge be-badge-active"><span className="be-badge-dot"/>Active</span>,
    pending_user_auth: <span className="be-badge be-badge-paused"><span className="be-badge-dot"/>Pending auth</span>,
    paused: <span className="be-badge be-badge-paused"><span className="be-badge-dot"/>Paused</span>,
    revoked: <span className="be-badge be-badge-failed"><span className="be-badge-dot"/>Revoked</span>,
  }[s]);
  return (
    <div className="adm-screen">
      <div className="adm-stats">
        <StatTile label="Active mandates" value="2,418"/>
        <StatTile label="Pending auth" value="34"/>
        <StatTile label="Paused" value="48"/>
        <StatTile label="AutoPay success (30d)" value="97.8%" deltaTone="be-gain"/>
      </div>
      <div className="adm-card adm-table">
        <div className="adm-card-head">
          <div>
            <span className="be-eyebrow">Mandates</span>
            <h3 className="adm-card-title">Active register</h3>
          </div>
          <div className="adm-card-actions">
            <button className="be-btn be-btn-secondary be-btn-sm">Filter status</button>
          </div>
        </div>
        <table>
          <thead><tr>
            <th>Mandate</th><th>User</th><th>Amount</th><th>Debit day</th><th>Status</th><th>Last debit</th><th>Next</th><th></th>
          </tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td><code className="adm-code">{r.id}</code></td>
                <td>{r.user}</td>
                <td className="be-money">{r.amount}</td>
                <td className="be-num">{r.day}</td>
                <td>{sb(r.status)}</td>
                <td className="adm-cell-meta">{r.last}</td>
                <td className="adm-cell-meta">{r.next}</td>
                <td className="adm-cell-actions">
                  <button className="be-btn be-btn-secondary be-btn-sm">Pause</button>
                  <button className="be-btn be-btn-danger be-btn-sm">Revoke</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

Object.assign(window, {
  AdminSidebar, AdminTopBar, StatTile,
  ApprovalsScreen, FundsScreen, PaymentsScreen, MandatesScreen,
});
