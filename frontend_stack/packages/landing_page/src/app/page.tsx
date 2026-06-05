import Nav from '../components/Nav';
import Hero from '../components/Hero';
import CourseCatalog from '../components/CourseCatalog';
import PremiumBenefits from '../components/PremiumBenefits';
import LearningMethod from '../components/LearningMethod';
import FinancialNews from '../components/FinancialNews';
import SocialProof from '../components/SocialProof';
import Plans from '../components/Plans';
import LeadForm from '../components/LeadForm';
import Footer from '../components/Footer';

// Public finance EDUCATION landing page. Education-only by company policy:
// no investing, SIP, portfolio, or account-opening language anywhere.
export default function HomePage() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <CourseCatalog />
        <PremiumBenefits />
        <LearningMethod />
        <FinancialNews />
        <SocialProof />
        <Plans />
        <LeadForm />
      </main>
      <Footer />
    </>
  );
}
