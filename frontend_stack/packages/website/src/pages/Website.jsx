import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import logo from '@beonedge/shared/assets/logo.svg';
import logoOnDark from '@beonedge/shared/assets/logo-on-dark.svg';
import '../styles/desktop/website.css';
import '../styles/mobile/website.css';

function WebsiteNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={`web-nav ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="web-nav-inner">
        <a className="web-nav-brand" href="#top"><img src={logo} alt="Beyond Edge" height="28" /></a>
        <div className="web-nav-links">
          <a href="#philosophy">Philosophy</a>
          <a href="#funds">Funds</a>
          <a href="#how">How it works</a>
          <a href="#disclosures">Disclosures</a>
        </div>
        <div className="web-nav-cta">
          <Link className="be-btn be-btn-ghost be-btn-sm" to="/app/login">Sign in</Link>
          <Link className="be-btn be-btn-primary be-btn-sm" to="/app/login?mode=signup">Open account</Link>
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
        {items.map((item) => (
          <div className="web-pulse-item" key={item.name}>
            <span className="web-pulse-name">{item.name}</span>
            <span className="be-money web-pulse-value">{item.value}</span>
            <span className={`be-num ${item.up ? 'be-gain' : 'be-loss'}`}>{item.delta}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section id="top" className="web-hero">
      <div className="web-hero-inner">
        <span className="be-eyebrow">Beyond Edge · Wealth Management</span>
        <h1 className="web-hero-title">Build wealth, deliberately.</h1>
        <p className="web-hero-sub">
          A research-led investment platform for Indian investors. Long horizons, transparent holdings, and disciplined allocation — across the Beyond Edge Growth Fund and beyond.
        </p>
        <div className="web-hero-actions">
          <Link className="be-btn be-btn-primary be-btn-lg" to="/app/login?mode=signup">Open account</Link>
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
          <div className="be-eyebrow">Flagship Strategy</div>
          <h3 className="web-hero-card-title">Beyond Edge Growth Fund</h3>
          <p className="web-hero-card-sub">Equity-led model portfolio · Recommended horizon 5 yr+</p>
          <svg viewBox="0 0 320 90" width="100%" height="90" className="web-hero-spark" aria-hidden="true">
            <polyline
              fill="none"
              stroke="#0E1116"
              strokeWidth="1.5"
              strokeLinejoin="round"
              points="0,72 32,68 64,76 96,80 128,68 160,52 192,46 224,58 256,40 288,30 320,18"
            />
            <polyline
              fill="none"
              stroke="#5C6470"
              strokeWidth="1"
              strokeDasharray="4 4"
              points="0,76 32,72 64,80 96,84 128,76 160,62 192,54 224,66 256,52 288,42 320,32"
            />
          </svg>
          <div className="web-hero-card-foot">
            <div><div className="be-eyebrow">Strategies</div><div className="be-money web-hero-num">3</div></div>
            <div><div className="be-eyebrow">Min Horizon</div><div className="be-money web-hero-num">5Y</div></div>
          </div>
          <p className="be-disclosure web-hero-disc">Past performance does not guarantee future returns. All data is admin-published and reviewed periodically.</p>
        </div>
      </aside>
    </section>
  );
}

function Philosophy() {
  const cards = [
    { eye: 'Patience', title: 'Multi-year horizons.', body: "We don't buy the news cycle. Holdings are evaluated against business fundamentals, not weekly noise." },
    { eye: 'Transparency', title: 'Holdings, in full.', body: 'Every Beyond Edge strategy publishes its complete holdings, allocation, and methodology.' },
    { eye: 'Discipline', title: 'Allocation, not anecdote.', body: 'We size positions with risk budgets, not narrative. Drawdowns are disclosed; promises are not.' },
  ];

  return (
    <section id="philosophy" className="web-section">
      <div className="web-section-inner">
        <span className="be-eyebrow">Investment Philosophy</span>
        <h2 className="web-section-title">A house view, written down.</h2>
        <div className="web-philo-grid">
          {cards.map((card) => (
            <div className="be-card web-philo-card" key={card.title}>
              <div className="be-eyebrow">{card.eye}</div>
              <h3 className="web-philo-title">{card.title}</h3>
              <p className="web-philo-body">{card.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FundShelf() {
  const funds = [
    { name: 'Beyond Edge Growth Fund', tag: 'Equity-led · 5Y+', risk: 'Moderate-High', horizon: '5Y+', status: 'active' },
    { name: 'Beyond Edge Static Fund', tag: 'Lower-risk static portfolio', risk: 'Conservative', horizon: '3Y+', status: 'soon' },
    { name: 'Beyond Edge Algo-Trade Fund', tag: 'Programmatic strategies', risk: 'High', horizon: '5Y+', status: 'soon' },
  ];

  return (
    <section id="funds" className="web-section web-section-dark">
      <div className="web-section-inner">
        <span className="be-eyebrow web-eyebrow-dark">Strategy Shelf</span>
        <h2 className="web-section-title web-section-title-dark">Three strategies. One discipline.</h2>
        <div className="web-fund-list">
          {funds.map((fund) => (
            <div className="web-fund-row" key={fund.name}>
              <div>
                <div className="web-fund-name">{fund.name}</div>
                <div className="web-fund-tag">{fund.tag}</div>
              </div>
              <div className="web-fund-risk"><span className="be-eyebrow web-eyebrow-dark">Risk</span><span>{fund.risk}</span></div>
              <div className="web-fund-horizon"><span className="be-eyebrow web-eyebrow-dark">Horizon</span><span>{fund.horizon}</span></div>
              <div className="web-fund-status">
                {fund.status === 'active'
                  ? <span className="be-badge be-badge-active"><span className="be-badge-dot" />Open</span>
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
    { n: '02', t: 'Risk profile & KYC', b: 'A short questionnaire and document upload. Reviewed by Beyond Edge.' },
    { n: '03', t: 'Approval', b: "You'll be notified once your account is approved." },
    { n: '04', t: 'Install the app', b: 'Daily access from the Beyond Edge Android app.' },
  ];

  return (
    <section id="how" className="web-section">
      <div className="web-section-inner">
        <span className="be-eyebrow">How it works</span>
        <h2 className="web-section-title">Four steps, then you’re live.</h2>
        <div className="web-steps">
          {steps.map((step) => (
            <div className="web-step" key={step.n}>
              <div className="web-step-n">{step.n}</div>
              <div className="web-step-t">{step.t}</div>
              <div className="web-step-b">{step.b}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer id="disclosures" className="web-foot">
      <div className="web-foot-inner">
        <div className="web-foot-brand">
          <img src={logoOnDark} height="26" alt="Beyond Edge" />
          <p className="web-foot-disc">Investments are subject to market risk. Read all scheme documents carefully before investing. Past performance does not guarantee future returns.</p>
        </div>
        <div className="web-foot-cols">
          <div><div className="be-eyebrow web-eyebrow-dark">Strategies</div><a href="#funds">Growth Fund</a><a href="#funds">Static Fund</a><a href="#funds">Algo-Trade Fund</a></div>
          <div><div className="be-eyebrow web-eyebrow-dark">Company</div><a href="#philosophy">Philosophy</a><a href="mailto:contact@beyondedge.in">Contact</a><a href="mailto:support@beyondedge.in">Support</a></div>
          <div><div className="be-eyebrow web-eyebrow-dark">Legal</div><Link to="/app/login">Sign in</Link><Link to="/app/login?mode=signup">Open account</Link><a href="#disclosures">Risk disclosure</a></div>
        </div>
      </div>
      <div className="web-foot-base">© 2026 Beyond Edge Wealth Pvt. Ltd. · Mumbai · contact@beyondedge.in</div>
    </footer>
  );
}

export default function Website() {
  return (
    <div data-screen-label="Website">
      <WebsiteNav />
      <MarketPulse />
      <Hero />
      <Philosophy />
      <FundShelf />
      <HowItWorks />
      <Footer />
    </div>
  );
}
