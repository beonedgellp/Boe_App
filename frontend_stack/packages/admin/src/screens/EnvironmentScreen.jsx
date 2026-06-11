import { useState, useEffect } from 'react';
import { Settings, Shield, AlertTriangle, CheckCircle2, Database, Server } from 'lucide-react';
import '../styles/desktop/admin.css';
import '../styles/mobile/admin.css';
import I from '../components/I.jsx';
import StatTile from '../components/StatTile.jsx';
import { apiRequest } from '@beonedge/client/services/_util.js';

function EnvironmentScreen() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    apiRequest('/v1/admin/app-config', { scope: 'admin' })
      .then((data) => {
        if (!cancelled) setConfig(data?.data ?? data ?? null);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Failed to load config.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const checks = config ? [
    { label: 'App config version', value: config.version || '—', ok: !!config.version },
    { label: 'Published at', value: config.publishedAt ? String(config.publishedAt).slice(0, 19).replace('T', ' ') : '—', ok: !!config.publishedAt },
    { label: 'Components', value: Array.isArray(config.components) ? `${config.components.length} component(s)` : 'None', ok: Array.isArray(config.components) && config.components.length > 0 },
    { label: 'Content blocks', value: Array.isArray(config.contentBlocks) ? `${config.contentBlocks.length} block(s)` : 'None', ok: Array.isArray(config.contentBlocks) && config.contentBlocks.length > 0 },
  ] : [];

  return (
    <div className="adm-screen">
      <div className="adm-stats">
        <StatTile label="Status" value={loading ? 'Loading...' : error ? 'Error' : 'OK'} />
        <StatTile label="Config version" value={config?.version || '—'} />
      </div>

      <div className="adm-card">
        <div className="adm-card-head">
          <div>
            <span className="be-eyebrow">System</span>
            <h2 className="adm-card-title">Environment</h2>
          </div>
        </div>

        {loading && <div className="adm-skeleton">Loading environment config...</div>}
        {error && <div className="be-error adm-m-t-4 adm-m-b-2">{error}</div>}

        {!loading && !error && config && (
          <div className="adm-card-body">
            <h4 className="adm-section-title">Health checks</h4>
            <div className="adm-health-checks">
              {checks.map((c) => (
                <div key={c.label} className="adm-health-check">
                  <I icon={c.ok ? CheckCircle2 : AlertTriangle} size={16} style={{ color: c.ok ? 'var(--be-green)' : 'var(--be-amber)' }} />
                  <span className="adm-health-check-label">{c.label}</span>
                  <span className="adm-health-check-value">{c.value}</span>
                </div>
              ))}
            </div>

            <h4 className="adm-section-title adm-section-title--spaced">Raw config</h4>
            <pre className="adm-code-block" style={{ maxHeight: 400 }}>
              {JSON.stringify(config, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default EnvironmentScreen;
