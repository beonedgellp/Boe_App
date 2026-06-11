import SectionHead from './SectionHead';
import Reveal from './Reveal';
import { socialProofDefaults } from '../lib/landingDefaults';
import type { SocialProofDefaults } from '../lib/landingDefaults';

export default function SocialProof({
  socialProof = socialProofDefaults,
}: {
  socialProof?: Partial<SocialProofDefaults>;
}) {
  const resolved = {
    stats: socialProof?.stats ?? socialProofDefaults.stats,
    testimonials: socialProof?.testimonials ?? socialProofDefaults.testimonials,
    instructorNote: socialProof?.instructorNote ?? socialProofDefaults.instructorNote,
  };

  return (
    <section className="section">
      <div className="container">
        <SectionHead
          eyebrow="Why learners trust us"
          title="Learning that builds real confidence"
          lead={resolved.instructorNote}
        />

        <div className="stats">
          {resolved.stats.map((stat) => (
            <div key={stat.id}>
              <div className="stat__value">{stat.value}</div>
              <div className="stat__label">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid--3">
          {resolved.testimonials.map((item) => (
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
  );
}
