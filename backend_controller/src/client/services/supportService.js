import { randomUUID } from 'node:crypto';
import { HttpError } from '#http/errors.js';
import { updateJsonStore, readJsonStore } from '#db/pgAdapter.js';

const VALID_CATEGORIES = ['general', 'technical', 'billing', 'kyc', 'sip', 'withdrawal', 'mandate'];
const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'];

const STATIC_FAQS = [
  {
    id: 'faq-sip-01',
    question: 'What is a SIP and how does it work?',
    answer: 'A Systematic Investment Plan (SIP) allows you to invest a fixed amount regularly in a mutual fund. It uses rupee-cost averaging to reduce market timing risk and builds wealth through disciplined investing.',
    category: 'sip',
    tags: ['sip', 'investment', 'beginner'],
  },
  {
    id: 'faq-sip-02',
    question: 'Can I pause or skip a SIP installment?',
    answer: 'Yes. You can submit a pause or skip request from the app. The request is reviewed and processed within 1-2 business days.',
    category: 'sip',
    tags: ['sip', 'pause', 'skip'],
  },
  {
    id: 'faq-mandate-01',
    question: 'What is a UPI AutoPay mandate?',
    answer: 'A UPI AutoPay mandate authorizes automatic debits from your linked bank account for SIP installments. It must be approved once and remains active until revoked.',
    category: 'mandate',
    tags: ['mandate', 'upi', 'autopay'],
  },
  {
    id: 'faq-kyc-01',
    question: 'Why is KYC required and how long does it take?',
    answer: 'Know Your Customer (KYC) verification is mandated by regulators. It typically takes 1-3 business days once documents are submitted correctly.',
    category: 'kyc',
    tags: ['kyc', 'verification', 'compliance'],
  },
  {
    id: 'faq-kyc-02',
    question: 'What documents are needed for KYC?',
    answer: 'You generally need a PAN card and address proof (Aadhaar, passport, or driving license). Additional documents may be requested based on your profile.',
    category: 'kyc',
    tags: ['kyc', 'documents', 'pan'],
  },
  {
    id: 'faq-withdrawal-01',
    question: 'How do I withdraw money from my portfolio?',
    answer: 'Go to Withdrawals, enter the amount, review the tax preview, and confirm. Redemptions are processed within 2-4 business days depending on the fund.',
    category: 'withdrawal',
    tags: ['withdrawal', 'redemption', 'payout'],
  },
  {
    id: 'faq-withdrawal-02',
    question: 'Are there any charges for withdrawals?',
    answer: 'Withdrawals may be subject to exit load depending on the fund and holding period. Tax implications are shown in the withdrawal preview before confirmation.',
    category: 'withdrawal',
    tags: ['withdrawal', 'charges', 'exit load'],
  },
  {
    id: 'faq-billing-01',
    question: 'How is the advisory fee calculated?',
    answer: 'The advisory fee is a percentage of assets under management and is deducted monthly. The exact rate is disclosed in your investment agreement.',
    category: 'billing',
    tags: ['billing', 'fees', 'advisory'],
  },
  {
    id: 'faq-technical-01',
    question: 'The app is not loading. What should I do?',
    answer: 'Try clearing the app cache, ensuring a stable internet connection, and updating to the latest version. If the issue persists, raise a support ticket.',
    category: 'technical',
    tags: ['technical', 'app', 'troubleshooting'],
  },
  {
    id: 'faq-general-01',
    question: 'How can I contact customer support?',
    answer: 'You can create a support ticket from the app or email support. Our team typically responds within 24 hours on business days.',
    category: 'general',
    tags: ['general', 'support', 'contact'],
  },
];

export async function createTicket(config, actor, body) {
  const { title, description, category = 'general', priority = 'medium', subject, body: bodyText } = body || {};
  const resolvedTitle = title || subject;
  const resolvedDescription = description || bodyText;

  if (!resolvedTitle || typeof resolvedTitle !== 'string' || resolvedTitle.trim().length === 0) {
    throw new HttpError(400, 'TITLE_REQUIRED', 'Ticket title is required.');
  }
  if (!resolvedDescription || typeof resolvedDescription !== 'string' || resolvedDescription.trim().length === 0) {
    throw new HttpError(400, 'DESCRIPTION_REQUIRED', 'Ticket description is required.');
  }
  if (!VALID_CATEGORIES.includes(category)) {
    throw new HttpError(400, 'INVALID_CATEGORY', `Category must be one of: ${VALID_CATEGORIES.join(', ')}.`);
  }
  if (!VALID_PRIORITIES.includes(priority)) {
    throw new HttpError(400, 'INVALID_PRIORITY', `Priority must be one of: ${VALID_PRIORITIES.join(', ')}.`);
  }

  const store = await readJsonStore(config);
  const user = store.users.find((u) => u.id === actor?.userId);
  if (!user) {
    throw new HttpError(404, 'USER_NOT_FOUND', 'User not found.');
  }

  const now = new Date().toISOString();
  const ticket = {
    id: randomUUID(),
    userId: actor.userId,
    title: resolvedTitle.trim(),
    description: resolvedDescription.trim(),
    category,
    priority,
    status: 'open',
    createdAt: now,
    updatedAt: now,
  };

  await updateJsonStore(config, (s) => {
    if (!Array.isArray(s.supportTickets)) s.supportTickets = [];
    s.supportTickets.push(ticket);
    return ticket;
  });

  return ticket;
}

export async function listFaqs(config) {
  const store = await readJsonStore(config);
  const publishedFaqs = (store.faqs || [])
    .filter((f) => f.status === 'published')
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((f) => ({
      id: f.id,
      question: f.question,
      answer: f.answer,
      category: f.category,
    }));
  if (publishedFaqs.length > 0) {
    return {
      items: publishedFaqs,
      count: publishedFaqs.length,
      source: 'json',
    };
  }
  // Fallback to static FAQs until admin publishes managed ones
  return {
    items: STATIC_FAQS,
    count: STATIC_FAQS.length,
    source: 'json',
  };
}
