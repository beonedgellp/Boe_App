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
          <Row label="App PIN" meta="Set" />
          <div className="apk-list-row">
            <div><div className="apk-list-l">Biometric unlock</div><div className="apk-list-meta">Use device fingerprint / face</div></div>
            <div className={'apk-toggle' + (bio ? ' is-on' : '')} onClick={() => setBio((v) => !v)} role="switch" aria-checked={bio} />
          </div>
          <Row label="Active sessions" meta="Pixel 8 · last seen today" />
          <Row label="Auto-lock" meta="1 minute" />
        </div>
        <div className="be-disclosure">Biometric unlock uses your device's secure enclave. BeOnEdge never receives your fingerprint or face data.</div>
      </div>
    </>
  );
}

function Row({ label, meta }) {
  return (
    <div className="apk-list-row">
      <div><div className="apk-list-l">{label}</div>{meta && <div className="apk-list-meta">{meta}</div>}</div>
      <div className="apk-list-r"><ChevronRight size={18} strokeWidth={1.5} /></div>
    </div>
  );
}
