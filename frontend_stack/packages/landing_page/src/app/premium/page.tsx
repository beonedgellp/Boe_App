import Link from 'next/link';
import Nav from '../../components/Nav';
import Reveal from '../../components/Reveal';
import Footer from '../../components/Footer';
import { premiumBenefits } from '../../content/benefits';

export const metadata = {
  title: 'Premium — BeOnEdge',
  description: 'Membership with news briefings, live sessions, and practical tools.',
};

export default function PremiumPage() {
  return (
    <>
      <Nav />
      <main>
        <section className="section">
          <div className="container">
            <div className="section__head">
              <h1 className="section__title">Premium membership</h1>
              <p className="section__lead">
                Ongoing learning, curated financial news, and practical tools — useful well beyond a single course.
              </p>
            </div>
            <div className="grid grid--3">
              {premiumBenefits.map((benefit) => (
                <Reveal as="div" key={benefit.id} className="card">
                  <h3 className="benefit__title">{benefit.title}</h3>
                  <p className="benefit__desc">{benefit.description}</p>
                </Reveal>
              ))}
            </div>
            <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
              <Link className="btn btn--primary" href="/plans">
                View plans
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
