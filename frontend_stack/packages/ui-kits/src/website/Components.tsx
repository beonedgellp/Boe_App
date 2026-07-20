import React, { useState } from 'react';
import logo from '@beonedge/shared/assets/logo.svg';
import logoOnDark from '@beonedge/shared/assets/logo-on-dark.svg';
import logoMark from '@beonedge/shared/assets/logo-mark.svg';

function WebsiteNav({ onCta }: any) {
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <nav className={`web-nav ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="web-nav-inner">
        <a className="web-nav-brand" href="#"><img src={logo} alt="BeOnEdge" height="28"/></a>
        <div className="web-nav-links">
          <a href="#philosophy">Philosophy</a>
          <a href="#funds">Funds</a>
          <a href="#how">How it works</a>
          <a href="#disclosures">Disclosures</a>
        </div>
        <div className="web-nav-cta">
          <a className="be-btn be-btn-ghost be-btn-sm" href="#login">Sign in</a>
          <button className="be-btn be-btn-primary be-btn-sm" onClick={onCta}>Open account</button>
        </div>
      </div>
    </nav>
  );
}

function MarketPulse() {
  const items = [
    { name: 'Nifty 50', value: '22,418.40', delta: '+0.42%', up: true },
    { name: 'Sensex', value: '73,872.16', delta: '+0.38%', up: true },
    { name: 'Nifty Bank', value: '47,210.05', delta: '−0.18%', up: false },
    { name: 'India VIX', value: '13.62', delta: '−2.10%', up: false },
  ];
  return (
    <div className="web-pulse">
      <div className="web-pulse-inner">
        <span className="be-eyebrow web-pulse-label">Market · 5-min delayed</span>
        {items.map(it => (
          <div className="web-pulse-item" key={it.name}>
            <span className="web-pulse-name">{it.name}</span>
            <span className="be-money web-pulse-value">{it.value}</span>
            <span className={`be-num ${it.up ? 'be-gain' : 'be-loss'}`}>{it.delta}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Hero({ onCta }: any) {
  return (
    <section className="web-hero">
      <div className="web-hero-inner">
        <span className="be-eyebrow">BeOnEdge · Wealth Management</span>
        <h1 className="web-hero-title">Build wealth, deliberately.</h1>
        <p className="web-hero-sub">A research-led investment platform for Indian investors. Long horizons, transparent holdings, and disciplined allocation — across the BeOnEdge Growth Fund and beyond.</p>
        <div className="web-hero-actions">
          <button className="be-btn be-btn-primary be-btn-lg" onClick={onCta}>Open account</button>
          <a className="be-btn be-btn-secondary be-btn-lg" href="#philosophy">Read philosophy</a>
        </div>
        <div className="web-hero-meta">
          <span><strong className="be-money">₹500</strong> minimum SIP</span>
          <span><strong className="be-money">₹5,000</strong> minimum lumpsum</span>
          <span>Fully digital onboarding</span>
        </div>
      </div>
      <aside className="web-hero-aside">
        <div className="be-card web-hero-card">
          <div className="be-eyebrow">Flagship Product</div>
          <h3 className="web-hero-card-title">BeOnEdge Growth Fund</h3>
          <p className="web-hero-card-sub">Equity-led model portfolio · Recommended horizon 5 yr+</p>
          <svg viewBox="0 0 320 90" width="100%" height="90" className="web-hero-spark">
            <polyline fill="none" stroke="#0E1116" strokeWidth="1.5" strokeLinejoin="round"
              points="0,72 32,68 64,76 96,80 128,68 160,52 192,46 224,58 256,40 288,30 320,18"/>
            <polyline fill="none" stroke="#5C6470" strokeWidth="1" strokeDasharray="4 4"
              points="0,76 32,72 64,80 96,84 128,76 160,62 192,54 224,66 256,52 288,42 320,32"/>
          </svg>
          <div className="web-hero-card-foot">
            <div><div className="be-eyebrow">5Y CAGR</div><div className="be-money web-hero-num be-gain">+18.4%</div></div>
            <div><div className="be-eyebrow">Drawdown (max)</div><div className="be-money web-hero-num">−14.2%</div></div>
          </div>
          <p className="be-disclosure web-hero-disc">Past performance does not guarantee future returns. NAV admin-published 28 Apr 2026.</p>
        </div>
      </aside>
    </section>
  );
}

function Philosophy() {
  const cards = [
    { eye: 'Patience', title: 'Multi-year horizons.', body: 'We don\'t buy the news cycle. Holdings are evaluated against business fundamentals, not weekly noise.' },
    { eye: 'Transparency', title: 'Holdings, in full.', body: 'Every BeOnEdge product publishes its complete holdings, allocation, and source-timestamped NAV.' },
    { eye: 'Discipline', title: 'Allocation, not anecdote.', body: 'We size positions with risk budgets, not narrative. Drawdowns are disclosed; promises are not.' },
  ];
  return (
    <section id="philosophy" className="web-section">
      <div className="web-section-inner">
        <span className="be-eyebrow">Investment Philosophy</span>
        <h2 className="web-section-title">A house view, written down.</h2>
        <div className="web-philo-grid">
          {cards.map(c => (
            <div className="be-card web-philo-card" key={c.title}>
              <div className="be-eyebrow">{c.eye}</div>
              <h3 className="web-philo-title">{c.title}</h3>
              <p className="web-philo-body">{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FundShelf() {
  const funds = [
    { name: 'BeOnEdge Growth Fund', tag: 'Equity-led · 5Y+', risk: 'Moderate-High', cagr: '+18.4%', status: 'active' },
    { name: 'BeOnEdge Static Fund', tag: 'Lower-risk static portfolio', risk: 'Conservative', cagr: '—', status: 'soon' },
    { name: 'BeOnEdge Algo-Trade Fund', tag: 'Programmatic strategies', risk: 'High', cagr: '—', status: 'soon' },
  ];
  return (
    <section id="funds" className="web-section web-section-dark">
      <div className="web-section-inner">
        <span className="be-eyebrow web-eyebrow-dark">Product Shelf</span>
        <h2 className="web-section-title web-section-title-dark">Three products. One discipline.</h2>
        <div className="web-fund-list">
          {funds.map(f => (
            <div className="web-fund-row" key={f.name}>
              <div>
                <div className="web-fund-name">{f.name}</div>
                <div className="web-fund-tag">{f.tag}</div>
              </div>
              <div className="web-fund-risk"><span className="be-eyebrow web-eyebrow-dark">Risk</span><span>{f.risk}</span></div>
              <div className="web-fund-cagr"><span className="be-eyebrow web-eyebrow-dark">5Y CAGR</span><span className="be-money">{f.cagr}</span></div>
              <div className="web-fund-status">
                {(f as any).status === 'active'
                  ? <span className="be-badge be-badge-active"><span className="be-badge-dot"/>Open</span>
                  : <span className="be-badge be-badge-gold">Coming soon</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { n: '01', t: 'Sign up on web', b: 'Identity, contact, and PAN/Aadhaar capture.' },
    { n: '02', t: 'Risk profile & KYC', b: 'A short questionnaire and document upload. Reviewed by BeOnEdge.' },
    { n: '03', t: 'Approval', b: 'You\'ll be notified once your account is approved.' },
    { n: '04', t: 'Install the app', b: 'Daily access from the BeOnEdge Android app.' },
  ];
  return (
    <section id="how" className="web-section">
      <div className="web-section-inner">
        <span className="be-eyebrow">How it works</span>
        <h2 className="web-section-title">Four steps, then you\u2019re live.</h2>
        <div className="web-steps">
          {steps.map(s => (
            <div className="web-step" key={s.n}>
              <div className="web-step-n">{s.n}</div>
              <div className="web-step-t">{s.t}</div>
              <div className="web-step-b">{s.b}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SignupForm({ open, onClose, onSubmit }: any) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  if (!open) return null;
  return (
    <div className="web-modal" onClick={onClose}>
      <div className="web-modal-card" onClick={e => e.stopPropagation()}>
        <button className="web-modal-close" onClick={onClose} aria-label="Close">×</button>
        <span className="be-eyebrow">Open Account · Step {step} of 3</span>
        <h3 className="web-modal-title">{step === 1 ? 'Tell us about you' : step === 2 ? 'Identity' : 'Risk profile'}</h3>
        {step === 1 && (
          <div>
            <div className="be-field"><label>Full name</label><input className="be-input" value={name} onChange={e=>setName(e.target.value)} placeholder="As on PAN"/></div>
            <div className="be-field"><label>Email</label><input className="be-input" value={email} onChange={e=>setEmail(e.target.value)} type="email"/></div>
            <div className="be-field"><label>Phone</label><input className="be-input" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+91"/></div>
            <button className="be-btn be-btn-primary be-btn-block" onClick={()=>setStep(2)}>Continue</button>
          </div>
        )}
        {step === 2 && (
          <div>
            <div className="be-field"><label>PAN number</label><input className="be-input" placeholder="ABCDE1234F"/></div>
            <div className="be-field"><label>Aadhaar (last 4)</label><input className="be-input" placeholder="••••" maxLength="4"/></div>
            <div className="be-field"><label>Photo ID upload</label>
              <div className="web-upload">Drop file or click to upload · JPG / PDF, max 5 MB</div>
            </div>
            <button className="be-btn be-btn-primary be-btn-block" onClick={()=>setStep(3)}>Continue</button>
          </div>
        )}
        {step === 3 && (
          <div>
            <div className="be-field"><label>Investment horizon</label>
              <select className="be-input"><option>Less than 1 year</option><option>1–3 years</option><option selected>3–5 years</option><option>5+ years</option></select>
            </div>
            <div className="be-field"><label>Loss tolerance</label>
              <select className="be-input"><option>I want capital protection</option><option selected>I can accept short-term losses for long-term gains</option><option>I can accept large drawdowns</option></select>
            </div>
            <p className="be-disclosure web-modal-disclosure">Investments are subject to market risk. Read all scheme documents carefully before investing.</p>
            <button className="be-btn be-btn-primary be-btn-block" onClick={onSubmit}>Submit application</button>
          </div>
        )}
      </div>
    </div>
  );
}

function SubmittedScreen({ onClose }: any) {
  return (
    <div className="web-modal">
      <div className="web-modal-card">
        <span className="be-eyebrow">Application received</span>
        <h3 className="web-modal-title">Thank you. We\u2019ll be in touch.</h3>
        <p className="web-modal-body">Our compliance team reviews each application individually. You\u2019ll receive an email within 1–2 business days. Once approved, install the BeOnEdge app to begin investing.</p>
        <div className="web-app-handoff">
          <div className="web-app-handoff-mark"><img src={logoMark} width="48" alt="BeOnEdge mark"/></div>
          <div>
            <div className="be-eyebrow">BeOnEdge for Android</div>
            <div className="web-app-handoff-name">Available after approval</div>
          </div>
          <button className="be-btn be-btn-secondary be-btn-sm" disabled>Download APK</button>
        </div>
        <button className="be-btn be-btn-ghost be-btn-block web-modal-close-btn" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer id="disclosures" className="web-foot">
      <div className="web-foot-inner">
        <div className="web-foot-brand">
          <img src={logoOnDark} height="26" alt="BeOnEdge"/>
          <p className="web-foot-disc">Investments are subject to market risk. Read all scheme documents carefully before investing. Past performance does not guarantee future returns.</p>
        </div>
        <div className="web-foot-cols">
          <div><div className="be-eyebrow web-eyebrow-dark">Products</div><a>Growth Fund</a><a>Static Fund</a><a>Algo-Trade Fund</a></div>
          <div><div className="be-eyebrow web-eyebrow-dark">Company</div><a>Philosophy</a><a>Team</a><a>Press</a></div>
          <div><div className="be-eyebrow web-eyebrow-dark">Legal</div><a>Terms</a><a>Privacy</a><a>Risk disclosure</a><a>Grievance</a></div>
        </div>
      </div>
      <div className="web-foot-base">© 2026 BeOnEdge Wealth Pvt. Ltd. · Mumbai · contact@beonedge.in</div>
    </footer>
  );
}

export { WebsiteNav, MarketPulse, Hero, Philosophy, FundShelf, HowItWorks, SignupForm, SubmittedScreen, Footer };
