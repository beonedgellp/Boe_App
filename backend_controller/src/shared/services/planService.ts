import type { AppConfig, Actor, UnknownRecord, StoreRecord } from '#types/index.js';
import { randomUUID } from 'node:crypto';
import { HttpError } from '#http/errors.js';
import { query } from '#db/client.js';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VALID_CADENCES = new Set(['one_time', 'monthly', 'yearly']);

function toTrimmedString(value: any, fallback = '') {
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
}

function validateSlug(slug: any) {
  if (!SLUG_PATTERN.test(slug)) {
    throw new HttpError(400, 'INVALID_SLUG', 'Slug must be lowercase alphanumeric with hyphens.');
  }
}

function rowToPlan(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    pricePaise: row.price_paise,
    cadence: row.cadence,
    features: row.features,
    ctaLabel: row.cta_label,
    featured: row.featured,
    status: row.status,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function sortPlans(items: any) {
  return items.sort((a: any, b: any) => {
    const sortDiff = (a.sortOrder || 0) - (b.sortOrder || 0);
    if (sortDiff !== 0) return sortDiff;
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });
}

export async function listPlans(config: AppConfig, opts: any = {}) {
  const result = await query(config, `
    SELECT * FROM plans
    WHERE status = 'published'
    ORDER BY sort_order ASC, created_at DESC
  `);
  const items = result.rows.map(rowToPlan);
  return { items, count: items.length, source: 'postgres' };
}

export async function listAdminPlans(config: AppConfig) {
  const result = await query(config, `
    SELECT * FROM plans
    ORDER BY sort_order ASC, created_at DESC
  `);
  const items = result.rows.map(rowToPlan);
  return { items, count: items.length, source: 'postgres' };
}

export async function createPlan(config: AppConfig, body: Record<string, unknown>) {
  const payload = body && typeof body === 'object' ? body : {};
  const slug = toTrimmedString(payload.slug);
  const name = toTrimmedString(payload.name);
  const tagline = toTrimmedString(payload.tagline);
  const pricePaise = payload.pricePaise !== undefined ? Number(payload.pricePaise) : NaN;
  const cadence = toTrimmedString(payload.cadence);

  if (!slug) throw new HttpError(400, 'SLUG_REQUIRED', 'Slug is required.');
  if (!name) throw new HttpError(400, 'NAME_REQUIRED', 'Name is required.');
  if (!tagline) throw new HttpError(400, 'TAGLINE_REQUIRED', 'Tagline is required.');
  if (!Number.isFinite(pricePaise) || pricePaise < 0) {
    throw new HttpError(400, 'PRICE_REQUIRED', 'Price (paise) is required and must be a non-negative integer.');
  }
  if (!cadence) throw new HttpError(400, 'CADENCE_REQUIRED', 'Cadence is required.');
  if (!VALID_CADENCES.has(cadence)) {
    throw new HttpError(400, 'INVALID_CADENCE', 'Cadence must be one of: one_time, monthly, yearly.');
  }
  validateSlug(slug);

  const features = Array.isArray(payload.features) ? payload.features : [];
  const now = new Date().toISOString();
  const plan = {
    id: randomUUID(),
    slug,
    name,
    tagline,
    pricePaise,
    cadence,
    features,
    ctaLabel: toTrimmedString(payload.ctaLabel, 'Get started'),
    featured: Boolean(payload.featured),
    status: 'draft',
    sortOrder: Number(payload.sortOrder) || 0,
    createdAt: now,
    updatedAt: now,
  };

  const result = await query(config, `
    INSERT INTO plans (id, slug, name, tagline, price_paise, cadence, features, cta_label, featured, status, sort_order, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11, $12, $13)
    RETURNING *
  `, [
    plan.id, plan.slug, plan.name, plan.tagline, plan.pricePaise, plan.cadence,
    JSON.stringify(plan.features), plan.ctaLabel, plan.featured, plan.status, plan.sortOrder,
    plan.createdAt, plan.updatedAt,
  ]);
  return rowToPlan(result.rows[0]);
}

export async function updatePlan(config: AppConfig, id: string, body: Record<string, unknown>) {
  if (!id) throw new HttpError(400, 'ID_REQUIRED', 'Plan ID is required.');
  const payload = body && typeof body === 'object' ? body : {};

  const fields = [];
  const values = [];
  let i = 1;

  if (payload.slug !== undefined) { fields.push(`slug = $${i++}`); values.push(toTrimmedString(payload.slug)); }
  if (payload.name !== undefined) { fields.push(`name = $${i++}`); values.push(toTrimmedString(payload.name)); }
  if (payload.tagline !== undefined) { fields.push(`tagline = $${i++}`); values.push(toTrimmedString(payload.tagline)); }
  if (payload.pricePaise !== undefined) { fields.push(`price_paise = $${i++}`); values.push(Number(payload.pricePaise) || 0); }
  if (payload.cadence !== undefined) {
    const c = toTrimmedString(payload.cadence);
    if (!VALID_CADENCES.has(c)) throw new HttpError(400, 'INVALID_CADENCE', 'Cadence must be one of: one_time, monthly, yearly.');
    fields.push(`cadence = $${i++}`);
    values.push(c);
  }
  if (payload.features !== undefined) {
    fields.push(`features = $${i++}`);
    values.push(JSON.stringify(Array.isArray(payload.features) ? payload.features : []));
  }
  if (payload.ctaLabel !== undefined) { fields.push(`cta_label = $${i++}`); values.push(toTrimmedString(payload.ctaLabel)); }
  if (payload.featured !== undefined) { fields.push(`featured = $${i++}`); values.push(Boolean(payload.featured)); }
  if (payload.status !== undefined) { fields.push(`status = $${i++}`); values.push(toTrimmedString(payload.status)); }
  if (payload.sortOrder !== undefined) { fields.push(`sort_order = $${i++}`); values.push(Number(payload.sortOrder) || 0); }

  if (fields.length === 0) {
    const result = await query(config, `SELECT * FROM plans WHERE id = $1`, [id]);
    if (!result.rows[0]) throw new HttpError(404, 'PLAN_NOT_FOUND', `Plan ${id} not found.`);
    return rowToPlan(result.rows[0]);
  }

  fields.push(`updated_at = $${i++}`);
  values.push(new Date().toISOString());
  values.push(id);

  const result = await query(config, `
    UPDATE plans SET ${fields.join(', ')} WHERE id = $${i} RETURNING *
  `, values);
  if (!result.rows[0]) throw new HttpError(404, 'PLAN_NOT_FOUND', `Plan ${id} not found.`);
  return rowToPlan(result.rows[0]);
}

export async function deletePlan(config: AppConfig, id: string) {
  if (!id) throw new HttpError(400, 'ID_REQUIRED', 'Plan ID is required.');

  const result = await query(config, `
    UPDATE plans SET status = 'archived', updated_at = now() WHERE id = $1 RETURNING *
  `, [id]);
  if (!result.rows[0]) throw new HttpError(404, 'PLAN_NOT_FOUND', `Plan ${id} not found.`);
  return rowToPlan(result.rows[0]);
}
