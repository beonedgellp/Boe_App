import Link from 'next/link';
import { fetchLandingConfig } from '../../lib/landingConfig';
import Nav from '../../components/Nav';
import Footer from '../../components/Footer';
import Reveal from '../../components/Reveal';
import { premiumDefaults } from '../../lib/landingDefaults';

export default async function PremiumPage() {
  const config = await fetchLandingConfig();
  const benefits = config?.premium?.benefits ?? premiumDefaults.benefits;

  return (
    <>
      <Nav nav={config?.nav} siteName={config?.meta?.siteName} />
      <main>
        <section className="section">
          <div className="container">
            <div className="section__head">
              <span className="eyebrow">Premium</span>
              <h1 className="section__title">Premium membership</h1>
              <p className="section__lead">
                Ongoing learning, news briefings, live sessions, and a private community of learners building better money habits.
              </p>
            </div>
            <div className="grid grid--3">
              {benefits.map((benefit) => (
                <Reveal as="div" key={benefit.id} className="card stagger-item">
                  <h3 className="benefit__title">{benefit.title}</h3>
                  <p className="benefit__desc">{benefit.description}</p>
                </Reveal>
              ))}
            </div>
            <div className="section__head" style={{ marginTop: '3rem', textAlign: 'center' }}>
              <Link className="btn btn--primary" href="/plans">
                View membership plans
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer meta={config?.meta} nav={config?.nav} />
    </>
  );
}
