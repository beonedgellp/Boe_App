import Nav from '../../components/Nav';
import Reveal from '../../components/Reveal';
import Footer from '../../components/Footer';
import { learningSteps } from '../../content/benefits';
import { testimonials, instructorNote } from '../../content/socialProof';

export const metadata = {
  title: 'About — BeOnEdge',
  description: 'Built by educators who believe clarity beats complexity.',
};

export default function AboutPage() {
  const displayedTestimonials = testimonials.slice(0, 3);

  return (
    <>
      <Nav />
      <main>
        <section className="section">
          <div className="container">
            <div className="section__head">
              <h1 className="section__title">About</h1>
              <p className="section__lead">
                Built by educators who believe clarity beats complexity. We teach
                practical finance so you can make calmer, clearer money decisions.
              </p>
            </div>
          </div>
        </section>

        <section className="section section--sunken">
          <div className="container split">
            <div className="section__head">
              <h2 className="section__title">A steady way to build money habits</h2>
            </div>
            <div className="steps">
              {learningSteps.map((item) => (
                <div className="step" key={item.step}>
                  <span className="step__num">{item.step}</span>
                  <div>
                    <p className="step__title">{item.title}</p>
                    <p className="step__desc">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="section__head">
              <h2 className="section__title">What learners say</h2>
            </div>
            <div className="grid grid--3">
              {displayedTestimonials.map((item) => (
                <Reveal as="div" key={item.id} className="card">
                  <p className="quote">“{item.quote}”</p>
                  <p className="quote__by">
                    <strong>{item.name}</strong> · {item.role}
                  </p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="section section--sunken">
          <div className="container">
            <div className="section__head">
              <h2 className="section__title">From the instructors</h2>
              <p className="section__lead">{instructorNote}</p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
