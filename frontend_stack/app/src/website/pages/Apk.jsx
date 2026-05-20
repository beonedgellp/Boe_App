import { Link } from 'react-router-dom';
import logo from '../../assets/logo.svg';
import '../../client/styles/base.css';

export default function Apk() {
  return (
    <main className="apk-stage" data-screen-label="Compatibility">
      <section className="apk-compat" aria-labelledby="apk-title">
        <img className="apk-logo" src={logo} width="164" height="38" alt="BeOnEdge" />
        <span className="be-eyebrow">Compatibility route</span>
        <h1 id="apk-title">Use the BeOnEdge web app</h1>
        <p>
          This route is retained for compatibility only. Continue through the web app for
          account access, onboarding, portfolio activity, and client actions.
        </p>
        <div className="apk-actions">
          <Link className="be-btn be-btn-primary be-btn-lg" to="/app/login">
            Sign in
          </Link>
          <Link className="be-btn be-btn-secondary be-btn-lg" to="/app/start">
            Open app
          </Link>
        </div>
      </section>
    </main>
  );
}
