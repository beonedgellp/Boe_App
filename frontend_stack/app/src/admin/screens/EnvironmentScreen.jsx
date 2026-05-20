import { useState, useEffect } from 'react';
import { Settings, Shield, AlertTriangle, CheckCircle2, Database, Server } from 'lucide-react';
import '../styles/admin.css';
import I from '../components/I.jsx';
import StatTile from '../components/StatTile.jsx';
import { apiRequest } from '../../client/services/_util.js';

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
            <h3 className="adm-card-title">Environment</h3>
          </div>
        </div>

        {loading && <div className="adm-skeleton">Loading environment config...</div>}
        {error && <div className="be-error" style={{ margin: 16 }}>{error}</div>}

        {!loading && !error && config && (
          <div style={{ padding: 16 }}>
            <h4 style={{ margin: '0 0 12px', fontSize: 14 }}>Health checks</h4>
            <div style={{ display: 'grid', gap: 8 }}>
              {checks.map((c) => (
                <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: 'var(--be-surface)', borderRadius: 6 }}>
                  <I icon={c.ok ? CheckCircle2 : AlertTriangle} size={16} style={{ color: c.ok ? 'var(--be-green)' : 'var(--be-amber)' }} />
                  <span style={{ flex: 1, fontWeight: 500 }}>{c.label}</span>
                  <span style={{ color: 'var(--be-slate)', fontSize: 13 }}>{c.value}</span>
                </div>
              ))}
            </div>

            <h4 style={{ margin: '24px 0 12px', fontSize: 14 }}>Raw config</h4>
            <pre style={{ background: 'var(--be-surface)', padding: 12, borderRadius: 8, fontSize: 12, overflow: 'auto', maxHeight: 400 }}>
              {JSON.stringify(config, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default EnvironmentScreen;
