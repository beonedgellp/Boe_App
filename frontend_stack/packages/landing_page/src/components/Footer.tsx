import Link from 'next/link';
import { site } from '../content/site';
import { authLinks } from '../content/nav';

// Education-positioned footer with the mandatory educational disclaimer.
// No investment-advice or account-opening links.
export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          <div>
            <div className="footer__brand">{site.name}</div>
            <p className="footer__desc">{site.longDescriptor}</p>
          </div>

          <div className="footer__col">
            <h4>Learn</h4>
            <ul>
              <li><Link href="/courses">All courses</Link></li>
              <li><Link href="/premium">Premium</Link></li>
              <li><Link href="/news">News</Link></li>
              <li><Link href="/plans">Plans</Link></li>
            </ul>
          </div>

          <div className="footer__col">
            <h4>Company</h4>
            <ul>
              <li><Link href="/about">About</Link></li>
              <li><Link href="/about">How it works</Link></li>
              <li><Link href="/#lead">Get course details</Link></li>
            </ul>
          </div>

          <div className="footer__col">
            <h4>Stay informed</h4>
            <ul>
              <li><Link href="/#lead">Newsletter signup</Link></li>
              <li><a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a></li>
              <li><Link href={authLinks.signIn.href}>Sign in</Link></li>
            </ul>
          </div>
        </div>

        <p className="footer__disclaimer">{site.disclaimer}</p>

        <div className="footer__bottom">
          <span>
            © {new Date().getFullYear()} {site.name}. {site.descriptor}
          </span>
          <span>
            <Link href="/terms">Terms</Link> · <Link href="/privacy">Privacy</Link> ·{' '}
            <Link href="/disclaimer">Educational disclaimer</Link> ·{' '}
            <Link href="/refund">Refund policy</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
