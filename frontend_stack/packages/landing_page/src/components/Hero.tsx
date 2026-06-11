import Link from 'next/link';
import { heroDefaults } from '../lib/landingDefaults';
import type { HeroDefaults } from '../lib/landingDefaults';

export default function Hero({ hero = heroDefaults }: { hero?: Partial<HeroDefaults> }) {
  const resolved = { ...heroDefaults, ...hero };
  return (
    <section className="hero" id="top">
      <div className="container hero__grid">
        <div>
          <span className="eyebrow">{resolved.eyebrow}</span>
          <h1 className="hero__title">{resolved.title}</h1>
          <p className="hero__lead">{resolved.lead}</p>
          <div className="hero__actions">
            <Link className="btn btn--primary" href={resolved.primaryCta.href}>
              {resolved.primaryCta.label}
            </Link>
            <Link className="btn btn--ghost" href={resolved.secondaryCta.href}>
              {resolved.secondaryCta.label}
            </Link>
          </div>
          <p className="hero__note">
            {resolved.note.split('Sign up').map((part, i, arr) => (
              <span key={i}>
                {part}
                {i < arr.length - 1 && (
                  <Link href={resolved.secondaryCta?.href ?? '/signup'}>Sign up</Link>
                )}
              </span>
            ))}
          </p>
        </div>

        <div className="hero__media" aria-hidden="true">
          <img
            src={resolved.imageUrl}
            alt={resolved.imageAlt}
            className="hero__image"
            width={600}
            height={450}
            loading="eager"
          />
        </div>
      </div>
    </section>
  );
}
