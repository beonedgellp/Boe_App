// Non-blocking brand-rule checks run before publishing landing content.
// Brand policy for client-facing copy: no exclamation marks, no emoji,
// no em or en dashes, never abbreviate the brand to "BOE" or "BE".

const EMOJI_PATTERN = /\p{Extended_Pictographic}/u;
const DASH_PATTERN = /[–—]/;
const ABBREVIATION_PATTERN = /\bBOE\b/;

function lintString(value, path, warnings) {
  if (value.includes('!')) {
    warnings.push({ path, message: 'contains an exclamation mark' });
  }
  if (EMOJI_PATTERN.test(value)) {
    warnings.push({ path, message: 'contains an emoji' });
  }
  if (DASH_PATTERN.test(value)) {
    warnings.push({ path, message: 'contains an em or en dash; use a comma, colon, or period' });
  }
  if (ABBREVIATION_PATTERN.test(value)) {
    warnings.push({ path, message: 'abbreviates the brand name; write BeOnEdge in full' });
  }
}

function walk(value, path, warnings) {
  if (typeof value === 'string') {
    lintString(value, path, warnings);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, `${path}[${index}]`, warnings));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      walk(child, path ? `${path}.${key}` : key, warnings);
    }
  }
}

export function lintLandingConfig(config) {
  const warnings = [];
  walk(config, '', warnings);
  return warnings;
}
