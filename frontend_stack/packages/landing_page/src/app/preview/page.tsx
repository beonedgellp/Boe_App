'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { exploreDefaults } from '../../lib/landingDefaults';
import type { LandingConfig } from '../../lib/landingDefaults';
import Nav from '../../components/Nav';
import Hero from '../../components/Hero';
import SocialProof from '../../components/SocialProof';
import LeadForm from '../../components/LeadForm';
import Footer from '../../components/Footer';

export default function PreviewPage() {
  const [config, setConfig] = useState<LandingConfig | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (
        (event.origin === 'http://localhost:5173' || event.origin === 'http://127.0.0.1:5173') &&
        event.data?.type === 'LANDING_PREVIEW_CONFIG'
      ) {
        setConfig(event.data.config as LandingConfig);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const explore = config?.explore ?? exploreDefaults;

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          background: '#1a1a2e',
          color: '#fff',
          padding: '8px 16px',
          fontSize: '13px',
          textAlign: 'center',
        }}
      >
        Preview mode — config pushed from admin panel
      </div>
      <Nav nav={config?.nav} siteName={config?.meta?.siteName} />
      <main>
        <Hero hero={config?.hero} />
        <section className="section">
          <div className="container">
            <div className="section__head">
              <h2 className="section__title">{explore.title}</h2>
              <p className="section__lead">{explore.lead}</p>
            </div>
            <div className="bento-grid">
              {(explore.tiles ?? exploreDefaults.tiles).map((tile) => (
                <Link
                  key={tile.id}
                  href={tile.href || '/'}
                  className={`bento-tile stagger-item${
                    tile.size === 'large' ? ' bento-tile--large' : ''
                  }${tile.size === 'wide' ? ' bento-tile--wide' : ''}`}
                >
                  <h3>{tile.title}</h3>
                  <p>{tile.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
        <SocialProof socialProof={config?.socialProof} />
        <LeadForm leadForm={config?.leadForm} />
      </main>
      <Footer meta={config?.meta} nav={config?.nav} />
    </>
  );
}
