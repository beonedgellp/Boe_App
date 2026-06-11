import Link from 'next/link';
import { fetchLandingConfig } from '../lib/landingConfig';
import { exploreDefaults } from '../lib/landingDefaults';
import Nav from '../components/Nav';
import Hero from '../components/Hero';
import SocialProof from '../components/SocialProof';
import LeadForm from '../components/LeadForm';
import Footer from '../components/Footer';

export default async function HomePage() {
  const config = await fetchLandingConfig();
  const explore = config?.explore ?? exploreDefaults;

  return (
    <>
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
