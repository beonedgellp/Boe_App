import { HttpError } from '#http/errors.js';

// Landing page config schema v1.
//
// Every top-level section is optional: the landing page falls back to its
// built-in content per missing section. A section that IS present must
// satisfy its field rules below. Unknown keys are stripped, not rejected,
// so older configs survive schema additions.

const MAX_CONFIG_BYTES = 256 * 1024;
const TEXT_MAX = 600;
const LONG_TEXT_MAX = 1200;

const HREF_PATTERN = /^(\/|#|https:\/\/)/;

const text = (options: any = {}) => ({ kind: 'string', max: TEXT_MAX, ...options });
const longText = (options: any = {}) => ({ kind: 'string', max: LONG_TEXT_MAX, ...options });
const href = (options: any = {}) => ({ kind: 'string', max: TEXT_MAX, pattern: HREF_PATTERN, patternHint: 'must start with /, #, or https://', ...options });
const link = (options: any = {}) => ({
  kind: 'object',
  fields: { label: text({ required: true }), href: href({ required: true }) },
  ...options,
});
const list = (item: any, maxItems: any, options: any = {}) => ({ kind: 'array', item, maxItems, ...options });

const SECTION_SPECS = {
  meta: {
    kind: 'object',
    fields: {
      siteName: text({ required: true }),
      descriptor: text(),
      longDescriptor: longText(),
      contactEmail: text({ pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, patternHint: 'must be a valid email address' }),
      disclaimer: longText(),
    },
  },
  nav: {
    kind: 'object',
    fields: {
      links: list(link(), 8),
      signIn: link(),
      signUp: link(),
    },
  },
  hero: {
    kind: 'object',
    fields: {
      eyebrow: text(),
      title: text({ required: true }),
      lead: longText(),
      primaryCta: link(),
      secondaryCta: link(),
      note: text(),
      imageUrl: href(),
      imageAlt: text(),
    },
  },
  explore: {
    kind: 'object',
    fields: {
      title: text(),
      lead: longText(),
      tiles: list({
        kind: 'object',
        fields: {
          id: text({ required: true }),
          title: text({ required: true }),
          description: longText(),
          href: href(),
          size: text({ enum: ['standard', 'large', 'wide'] }),
        },
      }, 8),
    },
  },
  socialProof: {
    kind: 'object',
    fields: {
      stats: list({
        kind: 'object',
        fields: {
          id: text(),
          value: text({ required: true }),
          label: text({ required: true }),
        },
      }, 6),
      testimonials: list({
        kind: 'object',
        fields: {
          id: text(),
          quote: longText({ required: true }),
          name: text({ required: true }),
          role: text(),
        },
      }, 8),
      instructorNote: longText(),
    },
  },
  premium: {
    kind: 'object',
    fields: {
      benefits: list({
        kind: 'object',
        fields: {
          id: text(),
          title: text({ required: true }),
          description: longText(),
        },
      }, 12),
    },
  },
  learningMethod: {
    kind: 'object',
    fields: {
      steps: list({
        kind: 'object',
        fields: {
          step: { kind: 'integer', min: 1, required: true },
          title: text({ required: true }),
          description: longText(),
        },
      }, 8),
    },
  },
  news: {
    kind: 'object',
    fields: {
      taglines: list(text(), 6),
      digests: list({
        kind: 'object',
        fields: {
          id: text(),
          tag: text(),
          title: text({ required: true }),
          summary: longText(),
        },
      }, 10),
    },
  },
  leadForm: {
    kind: 'object',
    fields: {
      eyebrow: text(),
      title: text(),
      lead: longText(),
      submitLabel: text(),
      successMessage: longText(),
      interestOptions: list(text(), 10),
    },
  },
};

export const LANDING_SECTIONS = Object.freeze(Object.keys(SECTION_SPECS));

function isPlainObject(value: any) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateString(value: any, spec: any, path: any, errors: any) {
  if (typeof value !== 'string') {
    errors.push({ path, message: 'must be a string' });
    return undefined;
  }
  if (spec.required && value.trim() === '') {
    errors.push({ path, message: 'must not be empty' });
    return undefined;
  }
  if (value.length > spec.max) {
    errors.push({ path, message: `must be at most ${spec.max} characters` });
    return undefined;
  }
  if (spec.enum && value !== '' && !spec.enum.includes(value)) {
    errors.push({ path, message: `must be one of: ${spec.enum.join(', ')}` });
    return undefined;
  }
  if (spec.pattern && value !== '' && !spec.pattern.test(value)) {
    errors.push({ path, message: spec.patternHint || 'has an invalid format' });
    return undefined;
  }
  return value;
}

function validateInteger(value: any, spec: any, path: any, errors: any) {
  if (!Number.isInteger(value)) {
    errors.push({ path, message: 'must be an integer' });
    return undefined;
  }
  if (spec.min !== undefined && value < spec.min) {
    errors.push({ path, message: `must be at least ${spec.min}` });
    return undefined;
  }
  return value;
}

function validateArray(value: any, spec: any, path: any, errors: any): any {
  if (!Array.isArray(value)) {
    errors.push({ path, message: 'must be an array' });
    return undefined;
  }
  if (value.length > spec.maxItems) {
    errors.push({ path, message: `must have at most ${spec.maxItems} items` });
    return undefined;
  }
  return value.map((item, index) => validateNode(item, spec.item, `${path}[${index}]`, errors));
}

function validateObject(value: any, spec: any, path: any, errors: any): any {
  if (!isPlainObject(value)) {
    errors.push({ path, message: 'must be an object' });
    return undefined;
  }

  const out: Record<string, any> = {};
  for (const [field, fieldSpec] of Object.entries<any>(spec.fields)) {
    const fieldPath = path ? `${path}.${field}` : field;
    const fieldValue = value[field];

    if (fieldValue === undefined || fieldValue === null) {
      if (fieldSpec.required) {
        errors.push({ path: fieldPath, message: 'is required' });
      }
      continue;
    }

    const validated = validateNode(fieldValue, fieldSpec, fieldPath, errors);
    if (validated !== undefined) out[field] = validated;
  }
  return out;
}

function validateNode(value: any, spec: any, path: any, errors: any): any {
  if (spec.kind === 'string') return validateString(value, spec, path, errors);
  if (spec.kind === 'integer') return validateInteger(value, spec, path, errors);
  if (spec.kind === 'array') return validateArray(value, spec, path, errors);
  return validateObject(value, spec, path, errors);
}

export function validateLandingConfig(input: any): any {
  if (!isPlainObject(input)) {
    throw new HttpError(400, 'INVALID_LANDING_CONFIG', 'Landing configuration must be a JSON object.');
  }

  const encoded = JSON.stringify(input);
  if (encoded.length > MAX_CONFIG_BYTES) {
    throw new HttpError(413, 'LANDING_CONFIG_TOO_LARGE', 'Landing configuration is larger than the supported limit.');
  }

  const errors: any[] = [];
  const sanitized: Record<string, any> = {};

  for (const [section, spec] of Object.entries(SECTION_SPECS)) {
    const value = input[section];
    if (value === undefined || value === null) continue;
    const validated = validateNode(value, spec, section, errors);
    if (validated !== undefined) sanitized[section] = validated;
  }

  if (errors.length > 0) {
    throw new HttpError(400, 'INVALID_LANDING_CONFIG', 'Landing configuration has invalid fields.', { errors });
  }

  return sanitized;
}
