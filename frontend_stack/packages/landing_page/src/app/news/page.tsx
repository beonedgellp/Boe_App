import Link from 'next/link';
import Nav from '../../components/Nav';
import Reveal from '../../components/Reveal';
import Footer from '../../components/Footer';
import { newsDigests } from '../../content/news';

export const metadata = {
  title: 'News — BeOnEdge',
  description: 'Jargon-free financial briefings that help you stay informed.',
};

export default function NewsPage() {
  return (
    <>
      <Nav />
      <main>
        <section className="section">
          <div className="container">
            <div className="section__head">
              <h1 className="section__title">Financial news, explained</h1>
              <p className="section__lead">
                Curated money and economy updates, summarised so you stay informed in minutes.
              </p>
            </div>
            <div className="grid grid--3">
              {newsDigests.map((digest) => (
                <Reveal as="div" key={digest.id} className="card">
                  <span className="digest__tag">{digest.tag}</span>
                  <h3 className="digest__title">{digest.title}</h3>
                  <p className="digest__summary">{digest.summary}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
