import SectionHead from './SectionHead';
import Reveal from './Reveal';
import { newsDefaults, metaDefaults } from '../lib/landingDefaults';
import type { NewsDefaults, MetaDefaults } from '../lib/landingDefaults';

export default function FinancialNews({
  news = newsDefaults,
  meta = metaDefaults,
}: {
  news?: Partial<NewsDefaults>;
  meta?: Partial<MetaDefaults>;
}) {
  const taglines = news?.taglines ?? newsDefaults.taglines;
  const digests = news?.digests ?? newsDefaults.digests;
  const disclaimer = meta?.disclaimer ?? metaDefaults.disclaimer;

  return (
    <section className="section section--sunken" id="news">
      <div className="container">
        <SectionHead
          eyebrow="Premium news"
          title={taglines[0]}
          lead={`${taglines[1]} ${taglines[2]}`}
        />
        <div className="grid grid--3">
          {digests.map((digest) => (
            <Reveal as="div" key={digest.id} className="card">
              <span className="digest__tag">{digest.tag}</span>
              <h3 className="digest__title">{digest.title}</h3>
              <p className="digest__summary">{digest.summary}</p>
            </Reveal>
          ))}
        </div>
        <p className="hero__note" style={{ marginTop: '1.75rem' }}>
          {disclaimer}
        </p>
      </div>
    </section>
  );
}
