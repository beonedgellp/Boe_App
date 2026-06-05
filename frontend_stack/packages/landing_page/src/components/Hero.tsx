import { authLinks, primaryCta, secondaryCta } from '../content/nav';

// Education-focused hero. No stock tickers, trading charts, return graphics,
// portfolio cards, or SIP/lumpsum language — an editorial course/digest
// preview only.
export default function Hero() {
  return (
    <section className="hero" id="top">
      <div className="container hero__grid">
        <div>
          <span className="eyebrow">Learn finance with clarity</span>
          <h1 className="hero__title">
            Understand money and manage it smarter.
          </h1>
          <p className="hero__lead">
            Practical finance courses and premium money insights that help you
            budget, save, handle debt and credit, and follow financial news
            without the jargon.
          </p>
          <div className="hero__actions">
            <a className="btn btn--primary" href={primaryCta.href}>
              {primaryCta.label}
            </a>
            <a className="btn btn--ghost" href={secondaryCta.href}>
              {secondaryCta.label}
            </a>
          </div>
          <p className="hero__note">
            New here? <a href={authLinks.signUp.href}>Sign up</a> to create a
            free learner account.
          </p>
        </div>

        <div className="hero__media" aria-hidden="true">
          <div className="preview">
            <div className="preview__bar">
              <strong>Your learning</strong>
              <span className="preview__chip">This week</span>
            </div>
            <div className="preview__row">
              <span className="preview__dot" />
              <div>
                <strong>Budgeting &amp; Expense Systems</strong>
                <span>Lesson 4 of 8 · with worksheets</span>
              </div>
            </div>
            <div className="preview__progress">
              <i style={{ width: '52%' }} />
            </div>
            <div className="preview__row">
              <span className="preview__dot" />
              <div>
                <strong>Economy in 5 minutes</strong>
                <span>New briefing · plain language</span>
              </div>
            </div>
            <div className="preview__row">
              <span className="preview__dot" />
              <div>
                <strong>Smart Spending &amp; Decisions</strong>
                <span>Up next · self-paced</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
