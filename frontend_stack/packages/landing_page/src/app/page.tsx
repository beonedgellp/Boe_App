import Link from 'next/link';
import Nav from '../components/Nav';
import Hero from '../components/Hero';
import SocialProof from '../components/SocialProof';
import LeadForm from '../components/LeadForm';
import Footer from '../components/Footer';

// Public finance EDUCATION landing page. Education-only by company policy:
// no investing, SIP, portfolio, or account-opening language anywhere.
export default function HomePage() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <section className="section">
          <div className="container">
            <div className="bento-grid">
              <Link href="/courses" className="bento-tile bento-tile--large">
                <h3>Courses</h3>
                <p>Practical lessons for real-life money decisions.</p>
              </Link>
              <Link href="/premium" className="bento-tile">
                <h3>Premium</h3>
                <p>News briefings, live sessions, and worksheets.</p>
              </Link>
              <Link href="/news" className="bento-tile">
                <h3>News</h3>
                <p>Jargon-free financial briefings.</p>
              </Link>
              <Link href="/plans" className="bento-tile">
                <h3>Plans</h3>
                <p>Choose the access that fits you.</p>
              </Link>
              <Link href="/about" className="bento-tile bento-tile--wide">
                <h3>About</h3>
                <p>Built by educators who believe clarity beats complexity.</p>
              </Link>
            </div>
          </div>
        </section>
        <SocialProof />
        <LeadForm />
      </main>
      <Footer />
    </>
  );
}
