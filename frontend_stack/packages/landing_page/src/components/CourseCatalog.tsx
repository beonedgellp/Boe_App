import SectionHead from './SectionHead';
import Reveal from './Reveal';
import { courses } from '../content/courses';

// Config-driven course catalog. Education products only — no funds or
// investment listings.
export default function CourseCatalog() {
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
