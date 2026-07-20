import React from 'react';
import AppBar from '../layout/AppBar.tsx';

const SECTIONS = [
  { h: 'Terms of use', p: 'By using BeOnEdge you agree to the terms published on our website. The app is provided as a client surface for accessing BeOnEdge investment strategies.' },
  { h: 'Privacy policy', p: 'BeOnEdge collects only the data required to administer your account and execute approved transactions. Personal identifiers are stored encrypted at rest. We never sell or share your data with third parties for marketing.' },
  { h: 'Risk disclosure', p: 'Investments are subject to market risk. Past performance does not guarantee future returns. The value of your investments may rise or fall. Read all strategy disclosures before investing.' },
  { h: 'Investment methodology', p: 'Each strategy displays its methodology, allocation, and disclosure version. Strategy-specific rules remain hidden until the published factsheet is available.' },
  { h: 'Grievance redressal', p: 'Grievance contacts and escalation timelines are published from the operating website and compliance records.' },
  { h: 'Regulatory licenses', p: 'BeOnEdge is licensed to operate this strategy. See the website for the exact licenses, certificates, and registration numbers.' },
  { h: 'App version', p: 'BeOnEdge client app' },
];

export default function Legal() {
  return (
    <>
      <AppBar title="Legal & disclosures" />
      <div className="apk-screen apk-screen-legal">
        {SECTIONS.map((s) => (
          <div key={s.h} className="apk-legal-section">
            <h3>{s.h}</h3>
            <p>{s.p}</p>
          </div>
        ))}
      </div>
    </>
  );
}
