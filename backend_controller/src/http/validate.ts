import { HttpError } from './errors.js';

export function validateBody(body: any, schema: Record<string, any>) {
  const errors: string[] = [];
  for (const [key, rules] of Object.entries<any>(schema)) {
    const value = body?.[key];
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`${key} is required.`);
      continue;
    }
    if (value === undefined || value === null) continue;
    if (rules.type === 'string' && typeof value !== 'string') {
      errors.push(`${key} must be a string.`);
    }
    if (rules.type === 'number' && (typeof value !== 'number' || !Number.isFinite(value))) {
      errors.push(`${key} must be a number.`);
    }
    if (rules.type === 'boolean' && typeof value !== 'boolean') {
      errors.push(`${key} must be a boolean.`);
    }
    if (rules.type === 'array' && !Array.isArray(value)) {
      errors.push(`${key} must be an array.`);
    }
    if (rules.type === 'object' && (typeof value !== 'object' || Array.isArray(value) || value === null)) {
      errors.push(`${key} must be an object.`);
    }
    if (rules.minLength && String(value).length < rules.minLength) {
      errors.push(`${key} must be at least ${rules.minLength} characters.`);
    }
    if (rules.maxLength && String(value).length > rules.maxLength) {
      errors.push(`${key} must be at most ${rules.maxLength} characters.`);
    }
    if (rules.min !== undefined && Number(value) < rules.min) {
      errors.push(`${key} must be at least ${rules.min}.`);
    }
    if (rules.max !== undefined && Number(value) > rules.max) {
      errors.push(`${key} must be at most ${rules.max}.`);
    }
    if (rules.pattern && !rules.pattern.test(String(value))) {
      errors.push(`${key} format is invalid.`);
    }
    if (rules.enum && !rules.enum.includes(value)) {
      errors.push(`${key} must be one of: ${rules.enum.join(', ')}.`);
    }
  }
  if (errors.length > 0) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Request body validation failed.', { errors });
  }
}
