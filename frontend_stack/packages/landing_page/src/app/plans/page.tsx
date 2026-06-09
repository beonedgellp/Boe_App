import Nav from '../../components/Nav';
import Plans from '../../components/Plans';
import Footer from '../../components/Footer';
import { fetchPlans } from '../../lib/plans';

export const metadata = {
  title: 'Plans — BeOnEdge',
  description: 'Choose the access that fits your learning journey.',
};

export default async function PlansPage() {
  let plans: Awaited<ReturnType<typeof fetchPlans>> = [];
  let error: string | null = null;

  try {
    plans = await fetchPlans();
  } catch {
    error = 'We could not load the plans right now. Please try again later.';
  }

  return (
    <>
      <Nav />
      <main>
        <section className="section">
          <div className="container">
            <div className="section__head">
              <h1 className="section__title">Plans</h1>
              <p className="section__lead">
                Start with a single course or join premium for ongoing learning,
                news briefings, and live sessions.
              </p>
            </div>
            {error ? (
              <p className="form__status form__status--error">{error}</p>
            ) : null}
          </div>
        </section>
        {!error ? <Plans plans={plans} /> : null}
      </main>
      <Footer />
    </>
  );
}
