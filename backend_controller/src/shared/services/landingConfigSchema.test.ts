import { strict as assert } from 'node:assert';
import { describe, test } from 'node:test';
import { validateLandingConfig, LANDING_SECTIONS } from './landingConfigSchema.js';

const VALID_CONFIG = {
  meta: {
    siteName: 'BeOnEdge',
    descriptor: 'Financial literacy for everyday India',
    contactEmail: 'hello@beonedge.example',
    disclaimer: 'Education only. BeOnEdge does not provide investment advice.',
  },
  nav: {
    links: [
      { label: 'Courses', href: '/courses' },
      { label: 'Plans', href: '/plans' },
    ],
    signIn: { label: 'Sign in', href: '/login' },
    signUp: { label: 'Create account', href: '/signup' },
  },
  hero: {
    title: 'Understand money and manage it smarter',
    lead: 'Plain-language courses on budgeting, saving, and credit.',
    primaryCta: { label: 'Start learning', href: '/signup' },
    imageUrl: 'https://example.com/hero.jpg',
    imageAlt: 'A learner reviewing a budget worksheet',
  },
  explore: {
    title: 'Explore what matters to you',
    tiles: [
      { id: 'courses', title: 'Courses', description: 'Self-paced lessons.', href: '/courses', size: 'large' },
    ],
  },
  socialProof: {
    stats: [{ id: 'learners', value: '40,000+', label: 'Learners' }],
    testimonials: [{ id: 't1', quote: 'The lessons finally made budgeting click.', name: 'Asha Pillai', role: 'Learner' }],
  },
  premium: {
    benefits: [{ id: 'b1', title: 'Weekly news briefings', description: 'Money news without jargon.' }],
  },
  learningMethod: {
    steps: [{ step: 1, title: 'Choose a course', description: 'Pick a topic that matters now.' }],
  },
  news: {
    taglines: ['Money news in plain language'],
    digests: [{ id: 'economy', tag: 'Economy', title: 'What rate changes mean for you', summary: 'A short explainer.' }],
  },
  leadForm: {
    title: 'Tell us what you want to learn',
    submitLabel: 'Send request',
    interestOptions: ['Budgeting', 'Saving'],
  },
};

function assertHttpError(error, status, code) {
  assert.equal(error.status, status);
  assert.equal(error.code, code);
  return true;
}

describe('validateLandingConfig', () => {
  test('accepts a full valid config and returns all sections', () => {
    const result = validateLandingConfig(VALID_CONFIG);
    for (const section of Object.keys(VALID_CONFIG)) {
      assert.ok(result[section], `expected section ${section} in output`);
    }
    assert.equal(result.hero.title, VALID_CONFIG.hero.title);
    assert.equal(result.nav.links.length, 2);
  });

  test('accepts a partial config (sections are optional)', () => {
    const result = validateLandingConfig({ hero: { title: 'Only a hero' } });
    assert.deepEqual(Object.keys(result), ['hero']);
  });

  test('accepts an empty object', () => {
    assert.deepEqual(validateLandingConfig({}), {});
  });

  test('rejects non-object input', () => {
    assert.throws(() => validateLandingConfig('nope'), (error) => assertHttpError(error, 400, 'INVALID_LANDING_CONFIG'));
    assert.throws(() => validateLandingConfig([1, 2]), (error) => assertHttpError(error, 400, 'INVALID_LANDING_CONFIG'));
    assert.throws(() => validateLandingConfig(null), (error) => assertHttpError(error, 400, 'INVALID_LANDING_CONFIG'));
  });

  test('strips unknown top-level and nested keys', () => {
    const result = validateLandingConfig({
      hero: { title: 'Hero', rogue: 'field' },
      unknownSection: { anything: true },
    });
    assert.equal(result.unknownSection, undefined);
    assert.equal(result.hero.rogue, undefined);
    assert.equal(result.hero.title, 'Hero');
  });

  test('rejects a present section missing required fields', () => {
    assert.throws(() => validateLandingConfig({ hero: { lead: 'No title here' } }), (error) => {
      assertHttpError(error, 400, 'INVALID_LANDING_CONFIG');
      assert.ok(error.details.errors.some((item) => item.path === 'hero.title'));
      return true;
    });
  });

  test('rejects hrefs that are not /, #, or https://', () => {
    assert.throws(() => validateLandingConfig({
      nav: { links: [{ label: 'Bad', href: 'javascript:alert(1)' }] },
    }), (error) => {
      assertHttpError(error, 400, 'INVALID_LANDING_CONFIG');
      assert.ok(error.details.errors.some((item) => item.path === 'nav.links[0].href'));
      return true;
    });
  });

  test('rejects over-limit arrays', () => {
    const tiles = Array.from({ length: 9 }, (_, index) => ({ id: `t${index}`, title: `Tile ${index}` }));
    assert.throws(() => validateLandingConfig({ explore: { tiles } }), (error) => {
      assertHttpError(error, 400, 'INVALID_LANDING_CONFIG');
      assert.ok(error.details.errors.some((item) => item.path === 'explore.tiles'));
      return true;
    });
  });

  test('rejects invalid enum and integer values', () => {
    assert.throws(() => validateLandingConfig({
      explore: { tiles: [{ id: 'x', title: 'X', size: 'giant' }] },
    }), (error) => assertHttpError(error, 400, 'INVALID_LANDING_CONFIG'));

    assert.throws(() => validateLandingConfig({
      learningMethod: { steps: [{ step: 0, title: 'Zero' }] },
    }), (error) => assertHttpError(error, 400, 'INVALID_LANDING_CONFIG'));
  });

  test('rejects oversize payloads', () => {
    const huge = { hero: { title: 'Hero', lead: 'x'.repeat(300 * 1024) } };
    assert.throws(() => validateLandingConfig(huge), (error) => assertHttpError(error, 413, 'LANDING_CONFIG_TOO_LARGE'));
  });

  test('exposes the section list', () => {
    assert.ok(LANDING_SECTIONS.includes('hero'));
    assert.ok(LANDING_SECTIONS.includes('leadForm'));
  });

  test('does not mutate the input object', () => {
    const input = { hero: { title: 'Immutable', rogue: 'still-here' } };
    const snapshot = JSON.parse(JSON.stringify(input));
    validateLandingConfig(input);
    assert.deepEqual(input, snapshot);
  });
});
