import SectionHead from './SectionHead';
import { learningMethodDefaults } from '../lib/landingDefaults';
import type { LearningMethodDefaults } from '../lib/landingDefaults';

export default function LearningMethod({
  learningMethod = learningMethodDefaults,
}: {
  learningMethod?: Partial<LearningMethodDefaults>;
}) {
  const steps = learningMethod?.steps ?? learningMethodDefaults.steps;

  return (
    <section className="section" id="about">
      <div className="container split">
        <SectionHead
          eyebrow="How it works"
          title="A steady way to build money habits"
        />
        <div className="steps">
          {steps.map((item) => (
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
  );
}
