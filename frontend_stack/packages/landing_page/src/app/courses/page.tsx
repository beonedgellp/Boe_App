import Nav from '../../components/Nav';
import CourseCatalog from '../../components/CourseCatalog';
import Footer from '../../components/Footer';
import { fetchCourses } from '../../lib/courses';

export const metadata = {
  title: 'Courses — BeOnEdge',
  description: 'Practical finance courses for real-life money decisions.',
};

export default async function CoursesPage() {
  let courses: Awaited<ReturnType<typeof fetchCourses>> = [];
  let error: string | null = null;

  try {
    courses = await fetchCourses();
  } catch {
    error = 'We could not load the courses right now. Please try again later.';
  }

  return (
    <>
      <Nav />
      <main>
        <section className="section">
          <div className="container">
            <div className="section__head">
              <h1 className="section__title">Courses</h1>
              <p className="section__lead">
                Practical lessons built around behaviour, systems, and decision
                clarity — short lessons you can apply right away.
              </p>
            </div>
            {error ? (
              <p className="form__status form__status--error">{error}</p>
            ) : null}
          </div>
        </section>
        {!error ? <CourseCatalog courses={courses} /> : null}
      </main>
      <Footer />
    </>
  );
}
