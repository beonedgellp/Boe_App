import { metaDefaults, navDefaults } from '../lib/landingDefaults';
import type { MetaDefaults, NavDefaults } from '../lib/landingDefaults';

export default function Footer({
  meta = metaDefaults,
  nav = navDefaults,
}: {
  meta?: Partial<MetaDefaults>;
  nav?: Partial<NavDefaults>;
}) {
  const resolvedMeta = { ...metaDefaults, ...meta };
  const resolvedNav = { ...navDefaults, ...nav };

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          <div>
            <div className="footer__brand">{resolvedMeta.siteName}</div>
            <p className="footer__desc">{resolvedMeta.longDescriptor}</p>
          </div>

          <div className="footer__col">
            <h4>Courses</h4>
            <ul>
              <li><a href="/courses">All courses</a></li>
              <li><a href="/about">How it works</a></li>
              <li><a href="/plans">Get course details</a></li>
            </ul>
          </div>

          <div className="footer__col">
            <h4>Premium</h4>
            <ul>
              <li><a href="/premium">Membership benefits</a></li>
              <li><a href="/news">Financial news</a></li>
              <li><a href="/plans">Plans</a></li>
            </ul>
          </div>

          <div className="footer__col">
            <h4>Stay informed</h4>
            <ul>
              <li><a href="/">Newsletter signup</a></li>
              <li><a href={`mailto:${resolvedMeta.contactEmail}`}>{resolvedMeta.contactEmail}</a></li>
              <li><a href={resolvedNav.signIn.href}>Sign in</a></li>
            </ul>
          </div>
        </div>

        <p className="footer__disclaimer">{resolvedMeta.disclaimer}</p>

        <div className="footer__bottom">
          <span>
            © {new Date().getFullYear()} {resolvedMeta.siteName}. {resolvedMeta.descriptor}
          </span>
          <span>
            <a href="/terms">Terms</a> · <a href="/privacy">Privacy</a> ·{' '}
            <a href="/disclaimer">Educational disclaimer</a> ·{' '}
            <a href="/refund">Refund policy</a>
          </span>
        </div>
      </div>
    </footer>
  );
}
