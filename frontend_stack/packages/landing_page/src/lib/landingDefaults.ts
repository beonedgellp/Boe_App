export const metaDefaults = {
  siteName: 'BeOnEdge',
  descriptor: 'Financial education, made clear.',
  longDescriptor:
    'Practical finance courses and premium money insights that help you understand income, budgeting, saving, debt, credit, taxes, and everyday money decisions.',
  contactEmail: 'learn@beonedge.in',
  disclaimer:
    'Content is for financial education and general awareness only. It does not constitute financial, legal, tax, or investment advice.',
} as const;

export const navDefaults = {
  links: [
    { label: 'Courses', href: '/courses' },
    { label: 'Premium', href: '/premium' },
    { label: 'News', href: '/news' },
    { label: 'Plans', href: '/plans' },
    { label: 'About', href: '/about' },
  ],
  signIn: { label: 'Sign in', href: '/login' },
  signUp: { label: 'Sign up', href: '/signup' },
} as const;

export const heroDefaults = {
  eyebrow: 'Learn finance with clarity',
  title: 'Understand money and manage it smarter.',
  lead: 'Practical finance courses and premium money insights that help you budget, save, handle debt and credit, and follow financial news without the jargon.',
  primaryCta: { label: 'Explore courses', href: '/courses' },
  secondaryCta: { label: 'View plans', href: '/plans' },
  note: 'New here? Sign up to create a free learner account.',
  imageUrl: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=600&q=80',
  imageAlt: 'Financial planning documents and calculator',
} as const;

export const exploreDefaults = {
  title: 'Explore what matters to you',
  lead: 'Courses, premium insights, news briefings, and flexible plans, all designed to help you understand money with confidence.',
  tiles: [
    { id: 'courses', title: 'Courses', description: 'Practical lessons for real-life money decisions.', href: '/courses', size: 'large' as const },
    { id: 'premium', title: 'Premium', description: 'News briefings, live sessions, and worksheets.', href: '/premium', size: 'standard' as const },
    { id: 'news', title: 'News', description: 'Jargon-free financial briefings.', href: '/news', size: 'standard' as const },
    { id: 'plans', title: 'Plans', description: 'Choose the access that fits you.', href: '/plans', size: 'standard' as const },
    { id: 'about', title: 'About', description: 'Built by educators who believe clarity beats complexity.', href: '/about', size: 'wide' as const },
  ],
} as const;

export const socialProofDefaults = {
  stats: [
    { id: 'learners', value: '40,000+', label: 'Learners enrolled' },
    { id: 'completions', value: '120,000+', label: 'Lessons completed' },
    { id: 'subscribers', value: '85,000+', label: 'Newsletter subscribers' },
    { id: 'rating', value: '4.8 / 5', label: 'Average course rating' },
  ],
  testimonials: [
    { id: 't1', quote: 'I finally have a budgeting system I actually stick to. The lessons are short and practical.', name: 'Ananya R.', role: 'First-time earner' },
    { id: 't2', quote: 'The debt and credit course gave me a clear repayment plan. No jargon, just steps I could follow.', name: 'Vikram S.', role: 'Young professional' },
    { id: 't3', quote: 'As a freelancer, the cash-flow trackers changed how I handle irregular income.', name: 'Meera J.', role: 'Freelance designer' },
  ],
  instructorNote:
    'Courses are built and reviewed by finance educators with years of teaching experience in personal finance and money management.',
} as const;

export const premiumDefaults = {
  benefits: [
    { id: 'news-briefings', title: 'Daily & weekly news briefings', description: 'Curated money and economy updates, summarised so you stay informed in minutes.' },
    { id: 'explainers', title: 'Plain-language explainers', description: 'Economic events broken down without jargon, so the news makes sense.' },
    { id: 'newsletters', title: 'Premium newsletters', description: 'Member newsletters with practical money ideas and clear takeaways.' },
    { id: 'live-qa', title: 'Live Q&A sessions', description: 'Ask questions and learn directly in member-only live sessions.' },
    { id: 'templates', title: 'Templates & worksheets', description: 'Downloadable budgeting templates, money trackers, and planning worksheets.' },
    { id: 'webinars', title: 'Member webinars', description: 'Deeper sessions on saving, budgeting, credit, and everyday financial habits.' },
    { id: 'certificates', title: 'Course certificates', description: 'Earn completion certificates as you finish courses.' },
    { id: 'community', title: 'Private learning community', description: 'A members-only space to learn alongside others building better money habits.' },
    { id: 'early-access', title: 'Early access to new courses', description: 'Be first to new courses, explainers, and learning material.' },
  ],
} as const;

export const learningMethodDefaults = {
  steps: [
    { step: 1, title: 'Choose a course or membership plan', description: 'Start with a single course or join premium for ongoing learning.' },
    { step: 2, title: 'Learn through short, practical lessons', description: 'Bite-sized lessons with real-life examples you can use right away.' },
    { step: 3, title: 'Apply concepts with worksheets and trackers', description: 'Put each idea into practice with templates and money trackers.' },
    { step: 4, title: 'Follow curated financial news and explainers', description: 'Stay aware with jargon-free briefings that connect to what you learn.' },
    { step: 5, title: 'Build repeatable money habits over time', description: 'Turn steady learning into habits you keep for the long run.' },
  ],
} as const;

export const newsDefaults = {
  taglines: [
    'Financial news, explained without jargon.',
    'Know what matters, not just what happened.',
    'Premium briefings for smarter money conversations.',
  ],
  digests: [
    { id: 'economy-5', tag: 'Economy', title: 'Economy in 5 minutes', summary: 'The week\'s big economic moves, summarised in plain language.' },
    { id: 'tax-updates', tag: 'Taxes', title: 'Tax updates explained', summary: 'What changed, who it affects, and what it means for everyday money.' },
    { id: 'credit-lending', tag: 'Credit', title: 'Credit & lending changes', summary: 'Shifts in borrowing, credit, and lending, decoded for real life.' },
    { id: 'budget-decoded', tag: 'Policy', title: 'Budget announcements decoded', summary: 'The headlines from major announcements, without the noise.' },
    { id: 'finance-reminders', tag: 'Habits', title: 'Personal finance reminders', summary: 'Timely rules and reminders to keep your money habits on track.' },
  ],
} as const;

export const leadFormDefaults = {
  eyebrow: 'Get learning details',
  title: 'Tell us what you want to learn',
  lead: 'Share your details and we\'ll send course and premium membership information. No pressure, just clear information to help you start learning.',
  submitLabel: 'Request course details',
  successMessage: 'Thanks. We\'ve received your request and will be in touch by email.',
  interestOptions: [
    'Premium membership',
    'Complete learning bundle',
    'A specific course',
    'Just exploring',
  ],
} as const;

export const landingDefaults = {
  meta: metaDefaults,
  nav: navDefaults,
  hero: heroDefaults,
  explore: exploreDefaults,
  socialProof: socialProofDefaults,
  premium: premiumDefaults,
  learningMethod: learningMethodDefaults,
  news: newsDefaults,
  leadForm: leadFormDefaults,
} as const;

export type MetaDefaults = typeof metaDefaults;
export type NavDefaults = typeof navDefaults;
export type HeroDefaults = typeof heroDefaults;
export type ExploreDefaults = typeof exploreDefaults;
export type SocialProofDefaults = typeof socialProofDefaults;
export type PremiumDefaults = typeof premiumDefaults;
export type LearningMethodDefaults = typeof learningMethodDefaults;
export type NewsDefaults = typeof newsDefaults;
export type LeadFormDefaults = typeof leadFormDefaults;

export type LandingConfig = {
  meta?: Partial<MetaDefaults>;
  nav?: Partial<NavDefaults>;
  hero?: Partial<HeroDefaults>;
  explore?: Partial<ExploreDefaults>;
  socialProof?: Partial<SocialProofDefaults>;
  premium?: Partial<PremiumDefaults>;
  learningMethod?: Partial<LearningMethodDefaults>;
  news?: Partial<NewsDefaults>;
  leadForm?: Partial<LeadFormDefaults>;
};
