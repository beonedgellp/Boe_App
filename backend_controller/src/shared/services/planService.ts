import type { AppConfig } from '#types/index.js';
import type { Prisma } from '@prisma/client';
import { HttpError } from '#http/errors.js';
import { prisma } from '#db/prisma.js';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VALID_CADENCES = new Set(['one_time', 'monthly', 'yearly']);

function toTrimmedString(value: unknown, fallback = ''): string {
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
}

function validateSlug(slug: string): void {
  if (!SLUG_PATTERN.test(slug)) {
    throw new HttpError(400, 'INVALID_SLUG', 'Slug must be lowercase alphanumeric with hyphens.');
  }
}

function toFeatures(value: unknown): Prisma.InputJsonValue {
  return (Array.isArray(value) ? value : []) as Prisma.InputJsonValue;
}

export async function listPlans(config: AppConfig, _opts: Record<string, unknown> = {}) {
  const items = await prisma.plan.findMany({
    where: { status: 'published' },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  });
  return { items, count: items.length, source: 'prisma' };
}

export async function listAdminPlans(config: AppConfig) {
  const items = await prisma.plan.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  });
  return { items, count: items.length, source: 'prisma' };
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

  return prisma.plan.create({
    data: {
      slug,
      name,
      tagline,
      pricePaise,
      cadence,
      features: toFeatures(payload.features),
      ctaLabel: toTrimmedString(payload.ctaLabel, 'Get started'),
      featured: Boolean(payload.featured),
      status: 'draft',
      sortOrder: Number(payload.sortOrder) || 0,
    },
  });
}

export async function updatePlan(config: AppConfig, id: string, body: Record<string, unknown>) {
  if (!id) throw new HttpError(400, 'ID_REQUIRED', 'Plan ID is required.');
  const payload = body && typeof body === 'object' ? body : {};

  if (payload.cadence !== undefined) {
    const c = toTrimmedString(payload.cadence);
    if (!VALID_CADENCES.has(c)) {
      throw new HttpError(400, 'INVALID_CADENCE', 'Cadence must be one of: one_time, monthly, yearly.');
    }
  }

  const data = {
    ...(payload.slug !== undefined ? { slug: toTrimmedString(payload.slug) } : {}),
    ...(payload.name !== undefined ? { name: toTrimmedString(payload.name) } : {}),
    ...(payload.tagline !== undefined ? { tagline: toTrimmedString(payload.tagline) } : {}),
    ...(payload.pricePaise !== undefined ? { pricePaise: Number(payload.pricePaise) || 0 } : {}),
    ...(payload.cadence !== undefined ? { cadence: toTrimmedString(payload.cadence) } : {}),
    ...(payload.features !== undefined ? { features: toFeatures(payload.features) } : {}),
    ...(payload.ctaLabel !== undefined ? { ctaLabel: toTrimmedString(payload.ctaLabel) } : {}),
    ...(payload.featured !== undefined ? { featured: Boolean(payload.featured) } : {}),
    ...(payload.status !== undefined ? { status: toTrimmedString(payload.status) } : {}),
    ...(payload.sortOrder !== undefined ? { sortOrder: Number(payload.sortOrder) || 0 } : {}),
  };

  const existing = await prisma.plan.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'PLAN_NOT_FOUND', `Plan ${id} not found.`);

  if (Object.keys(data).length === 0) return existing;

  return prisma.plan.update({ where: { id }, data });
}

export async function deletePlan(config: AppConfig, id: string) {
  if (!id) throw new HttpError(400, 'ID_REQUIRED', 'Plan ID is required.');

  const existing = await prisma.plan.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'PLAN_NOT_FOUND', `Plan ${id} not found.`);

  return prisma.plan.update({
    where: { id },
    data: { status: 'archived' },
  });
}
