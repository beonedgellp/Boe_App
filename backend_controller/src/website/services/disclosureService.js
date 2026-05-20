// Disclosure content service — SEBI/AMFI mandated blocks
import { jsonStoreEnabled, readJsonStore } from '#db/jsonStore.js';

const RISKOMETER_CONFIG = {
  low: {
    color: '#22c55e',
    label: 'Low',
    description: 'Principal at low risk. Suitable for conservative investors seeking capital preservation.',
  },
  moderate: {
    color: '#eab308',
    label: 'Moderate',
    description: 'Principal at moderate risk. Suitable for investors seeking modest growth with balanced risk.',
  },
  high: {
    color: '#f97316',
    label: 'High',
    description: 'Principal at high risk. Suitable for investors seeking aggressive growth with high risk tolerance.',
  },
  very_high: {
    color: '#ef4444',
    label: 'Very High',
    description: 'Principal at very high risk. Suitable only for investors with substantial risk appetite and long horizon.',
  },
};

export async function getDisclosures(config) {
  const riskLevel = config?.riskLevel || 'moderate';
  const riskometer = RISKOMETER_CONFIG[riskLevel] || RISKOMETER_CONFIG.moderate;

  let publishedDisclosure = null;
  if (jsonStoreEnabled(config)) {
    const store = await readJsonStore(config);
    if (store.disclosures) {
      publishedDisclosure = store.disclosures
        .filter((d) => d.status === 'published')
        .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))[0];
    }
  }

  return {
    riskometer: {
      level: riskLevel,
      color: riskometer.color,
      label: riskometer.label,
      description: riskometer.description,
    },
    sebiDisclosure: publishedDisclosure?.content
      || 'Mutual fund investments are subject to market risks. Read all scheme-related documents carefully before investing. Past performance is not indicative of future returns.',
    expenseRatio: config?.expenseRatio || '1.25%',
    exitLoad: config?.exitLoad || '1% if redeemed within 12 months',
    schemeCategory: config?.schemeCategory || 'Equity - Large Cap',
    investorCharterUrl: '/investor-charter',
    grievanceUrl: '/grievance',
    disclosureVersion: publishedDisclosure?.version || '1.0',
    disclosurePublishedAt: publishedDisclosure?.publishedAt || null,
  };
}

export async function getInvestorCharter(config) {
  let page = null;
  if (jsonStoreEnabled(config)) {
    const store = await readJsonStore(config);
    if (store.staticPages) {
      page = store.staticPages.find((p) => p.slug === 'investor-charter' && p.status === 'published');
    }
  }

  if (page?.content) {
    try { return JSON.parse(page.content); } catch { /* fall through */ }
  }

  return {
    title: 'Investor Charter',
    updatedAt: config?.charterUpdatedAt || '2026-01-15',
    sections: [
      {
        heading: 'Rights of Investors',
        items: [
          'Right to receive information about the investment product, its risks, costs, and performance.',
          'Right to fair and transparent treatment by the investment manager and intermediaries.',
          'Right to timely grievance redressal and access to the escalation matrix.',
          'Right to privacy and protection of personal data as per applicable regulations.',
          'Right to exit the investment subject to the terms of the scheme.',
        ],
      },
      {
        heading: 'Responsibilities of Investors',
        items: [
          'Read the Scheme Information Document (SID), Statement of Additional Information (SAI), and factsheet before investing.',
          'Understand the risk profile of the scheme and ensure it aligns with your risk appetite.',
          'Provide accurate KYC information and update changes promptly.',
          'Monitor investment statements and report discrepancies within 30 days.',
          'Be cautious of unsolicited investment advice and verify SEBI registration of intermediaries.',
        ],
      },
      {
        heading: 'Do\'s and Don\'ts',
        items: [
          'Do assess your financial goals, horizon, and risk tolerance before investing.',
          'Do keep records of transaction confirmations, account statements, and KYC documents.',
          'Don\'t invest based solely on past performance or tips from unverified sources.',
          'Don\'t share your login credentials or UPI PIN with anyone.',
        ],
      },
      {
        heading: 'Expectations from BeOnEdge',
        items: [
          'Timely disclosure of NAV, portfolio holdings, and scheme changes.',
          'Fair and non-discriminatory treatment of all investors.',
          'Grievance resolution within the timelines prescribed by SEBI.',
          'Regular communication about material changes to the scheme or risk factors.',
        ],
      },
    ],
    contact: {
      email: config?.supportEmail || 'support@beonedge.example',
      phone: config?.supportPhone || '+91-80-1234-5678',
      hours: 'Monday – Friday, 9:00 AM – 6:00 PM IST',
      address:
        'BeOnEdge Financial Services Pvt. Ltd.\nTower A, 4th Floor, Embassy Tech Village\nBengaluru, Karnataka 560103, India',
    },
  };
}

export async function getGrievanceContent(config) {
  let page = null;
  if (jsonStoreEnabled(config)) {
    const store = await readJsonStore(config);
    if (store.staticPages) {
      page = store.staticPages.find((p) => p.slug === 'grievance' && p.status === 'published');
    }
  }

  if (page?.content) {
    try { return JSON.parse(page.content); } catch { /* fall through */ }
  }

  return {
    title: 'Grievance Redressal',
    updatedAt: config?.grievanceUpdatedAt || '2026-01-15',
    summary:
      'BeOnEdge is committed to resolving investor grievances in a fair and timely manner. This page outlines the process, timelines, and escalation channels available to you.',
    steps: [
      {
        step: 1,
        title: 'Level 1 — Support Ticket',
        description:
          'Raise a support ticket through the app or email us at the address below. Most queries are resolved at this stage.',
        timeline: 'Initial response within 2 business days. Resolution within 7 business days.',
        actionLabel: 'Raise a ticket',
        actionRoute: '/app/profile/support',
      },
      {
        step: 2,
        title: 'Level 2 — Internal Escalation',
        description:
          'If you are not satisfied with the Level 1 response, escalate to the Grievance Officer.',
        timeline: 'Response within 5 business days of escalation.',
        contactEmail: config?.grievanceEmail || 'grievance@beonedge.example',
      },
      {
        step: 3,
        title: 'Level 3 — SEBI SCORES',
        description:
          'If the grievance remains unresolved, you may lodge a complaint on the SEBI SCORES portal.',
        timeline: 'As per SEBI SCORES timelines.',
        externalUrl: 'https://scores.sebi.gov.in',
      },
    ],
    timelines: [
      { label: 'Acknowledgement', value: 'Within 2 business days' },
      { label: 'Initial response', value: 'Within 5 business days' },
      { label: 'Resolution target', value: 'Within 21 business days' },
      { label: 'Escalation review', value: 'Within 10 business days' },
    ],
    contact: {
      email: config?.grievanceEmail || 'grievance@beonedge.example',
      phone: config?.grievancePhone || '+91-80-1234-5679',
      hours: 'Monday – Friday, 9:00 AM – 6:00 PM IST',
      officerName: config?.grievanceOfficer || 'Grievance Officer',
      address:
        'BeOnEdge Financial Services Pvt. Ltd.\nTower A, 4th Floor, Embassy Tech Village\nBengaluru, Karnataka 560103, India',
    },
  };
}
