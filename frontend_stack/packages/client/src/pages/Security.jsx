import React, { useState } from 'react';
import AppBar from '../layout/AppBar.jsx';
import { ChevronRight } from 'lucide-react';

export default function Security() {
  const [bio, setBio] = useState(true);
  return (
    <>
      <AppBar title="Security & PIN" />
      <div className="apk-screen">
        <div className="be-card" style={{ padding: 0 }}>
          <Row label="App PIN" meta="Set" comingSoon />
          <div className="apk-list-row">
            <div><div className="apk-list-l">Biometric unlock</div><div className="apk-list-meta">Use device fingerprint / face</div></div>
            <div className={'apk-toggle' + (bio ? ' is-on' : '')} onClick={() => setBio((v) => !v)} role="switch" aria-checked={bio} />
          </div>
          <Row label="Active sessions" meta="Pixel 8 · last seen today" comingSoon />
          <Row label="Auto-lock" meta="1 minute" comingSoon />
        </div>
        <div className="be-disclosure">Biometric unlock uses your device's secure enclave. We never receive your fingerprint or face data.</div>
      </div>
    </>
  );
}

function Row({ label, meta, comingSoon }) {
  return (
    <div className="apk-list-row">
      <div><div className="apk-list-l">{label}</div>{meta && <div className="apk-list-meta">{meta}</div>}</div>
      <div className="apk-list-r">
        {comingSoon ? (
          <span style={{ fontSize: 12, color: 'var(--be-slate)' }}>Coming soon</span>
        ) : (
          <ChevronRight size={18} strokeWidth={1.5} />
        )}
      </div>
    </div>
  );
}
