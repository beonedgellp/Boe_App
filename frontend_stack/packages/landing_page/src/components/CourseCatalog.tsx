import SectionHead from './SectionHead';
import Reveal from './Reveal';
import { type Course } from '../lib/courses';
import { formatPrice } from '../lib/plans';

function formatCoursePrice(pricePaise?: number): string | null {
  if (typeof pricePaise !== 'number') return null;
  return formatPrice(pricePaise);
}

// Config-driven course catalog. Education products only — no funds or
// investment listings.
export default function CourseCatalog({ courses }: { courses: Course[] }) {
  if (courses.length === 0) {
    return (
      <section className="section" id="courses">
        <div className="container">
          <SectionHead
            eyebrow="Courses"
            title="Practical courses for real-life money decisions"
            lead="Each course is built around behaviour, systems, and decision clarity — short lessons you can apply right away."
          />
          <p className="section__lead" style={{ marginTop: '2rem' }}>
            No courses available right now. Check back soon.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="section" id="courses">
      <div className="container">
        <SectionHead
          eyebrow="Courses"
          title="Practical courses for real-life money decisions"
          lead="Each course is built around behaviour, systems, and decision clarity — short lessons you can apply right away."
        />
        <div className="grid grid--3">
          {courses.map((course) => (
            <Reveal as="div" key={course.id} className="card course">
              <div className="course__meta">
                <span className="tag">{course.level}</span>
                <span className="tag tag--muted">{course.format}</span>
              </div>
              <h3 className="course__name">{course.name}</h3>
              <p className="course__outcome">{course.outcome}</p>
              {typeof course.pricePaise === 'number' ? (
                <p className="course__price">{formatCoursePrice(course.pricePaise)}</p>
              ) : null}
              <a className="card__cta" href="#lead">
                View details
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
