'use client';

import Link from 'next/link';
import Nav from './Nav';
import type { LegalPolicy } from '../content/legal';

export default function LegalLayout({ policy }: { policy: LegalPolicy }) {
  return (
    <>
      <Nav />
      <main className="legal-page">
        <div className="container">
          <Link href="/" className="legal-page__back">
            ← Back to home
          </Link>
          <div className="legal-page__header">
            <h1 className="legal-page__title">{policy.title}</h1>
            <p className="legal-page__updated">Last updated: {policy.lastUpdated}</p>
          </div>

          {policy.sections.map((section, i) => (
            <section key={i} className="legal-page__section">
              <h2>{section.heading}</h2>
              {section.body.map((paragraph, j) => (
                <p key={j}>{paragraph}</p>
              ))}
            </section>
          ))}
        </div>
      </main>
    </>
  );
}
