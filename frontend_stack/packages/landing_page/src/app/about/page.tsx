import Nav from '../../components/Nav';
import Footer from '../../components/Footer';
import Reveal from '../../components/Reveal';
import { learningSteps } from '../../content/benefits';
import { testimonials, instructorNote } from '../../content/socialProof';

export default function AboutPage() {
  return (
    <>
      <Nav />
      <main>
        <section className="section">
          <div className="container">
            <div className="section__head">
              <span className="eyebrow">About</span>
              <h1 className="section__title">Built by educators who believe clarity beats complexity</h1>
              <p className="section__lead">
                BeOnEdge is a financial education platform designed for Indian learners. We teach practical money skills: budgeting, saving, debt management, and news literacy, without jargon or product pitches.
              </p>
            </div>

            <div className="section__head">
              <h2 className="section__title" style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}>
                How learning works
              </h2>
            </div>
            <div className="steps">
              {learningSteps.map((step) => (
                <div key={step.step} className="step stagger-item">
                  <div className="step__num">{step.step}</div>
                  <div>
                    <div className="step__title">{step.title}</div>
                    <p className="step__desc">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section section--sunken">
          <div className="container">
            <div className="section__head">
              <h2 className="section__title" style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}>
                What learners say
              </h2>
            </div>
            <div className="grid grid--3">
              {testimonials.map((item) => (
                <Reveal as="div" key={item.id} className="card">
                  <p className="quote">“{item.quote}”</p>
                  <p className="quote__by">
                    <strong>{item.name}</strong> · {item.role}
                  </p>
                </Reveal>
              ))}
            </div>
            <p className="section__lead" style={{ marginTop: '2rem', textAlign: 'center' }}>
              {instructorNote}
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
