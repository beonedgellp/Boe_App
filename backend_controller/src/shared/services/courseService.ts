import type { AppConfig } from '#types/index.js';
import { HttpError } from '#http/errors.js';
import { prisma } from '#db/prisma.js';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function toTrimmedString(value: unknown, fallback = ''): string {
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
}

function validateSlug(slug: string): void {
  if (!SLUG_PATTERN.test(slug)) {
    throw new HttpError(400, 'INVALID_SLUG', 'Slug must be lowercase alphanumeric with hyphens.');
  }
}

export async function listCourses(config: AppConfig, _opts: Record<string, unknown> = {}) {
  const items = await prisma.course.findMany({
    where: { status: 'published' },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  });
  return { items, count: items.length, source: 'prisma' };
}

export async function listAdminCourses(config: AppConfig) {
  const items = await prisma.course.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  });
  return { items, count: items.length, source: 'prisma' };
}

export async function createCourse(config: AppConfig, body: Record<string, unknown>) {
  const payload = body && typeof body === 'object' ? body : {};
  const slug = toTrimmedString(payload.slug);
  const name = toTrimmedString(payload.name);
  const level = toTrimmedString(payload.level);
  const format = toTrimmedString(payload.format);
  const outcome = toTrimmedString(payload.outcome);

  if (!slug) throw new HttpError(400, 'SLUG_REQUIRED', 'Slug is required.');
  if (!name) throw new HttpError(400, 'NAME_REQUIRED', 'Name is required.');
  if (!level) throw new HttpError(400, 'LEVEL_REQUIRED', 'Level is required.');
  if (!format) throw new HttpError(400, 'FORMAT_REQUIRED', 'Format is required.');
  if (!outcome) throw new HttpError(400, 'OUTCOME_REQUIRED', 'Outcome is required.');
  validateSlug(slug);

  return prisma.course.create({
    data: {
      slug,
      name,
      level,
      format,
      outcome,
      description: payload.description !== undefined ? toTrimmedString(payload.description) : null,
      pricePaise: payload.pricePaise !== undefined ? Number(payload.pricePaise) || null : null,
      status: 'draft',
      sortOrder: Number(payload.sortOrder) || 0,
    },
  });
}

export async function updateCourse(config: AppConfig, id: string, body: Record<string, unknown>) {
  if (!id) throw new HttpError(400, 'ID_REQUIRED', 'Course ID is required.');
  const payload = body && typeof body === 'object' ? body : {};

  const data = {
    ...(payload.slug !== undefined ? { slug: toTrimmedString(payload.slug) } : {}),
    ...(payload.name !== undefined ? { name: toTrimmedString(payload.name) } : {}),
    ...(payload.level !== undefined ? { level: toTrimmedString(payload.level) } : {}),
    ...(payload.format !== undefined ? { format: toTrimmedString(payload.format) } : {}),
    ...(payload.outcome !== undefined ? { outcome: toTrimmedString(payload.outcome) } : {}),
    ...(payload.description !== undefined ? { description: toTrimmedString(payload.description) } : {}),
    ...(payload.pricePaise !== undefined ? { pricePaise: Number(payload.pricePaise) || null } : {}),
    ...(payload.status !== undefined ? { status: toTrimmedString(payload.status) } : {}),
    ...(payload.sortOrder !== undefined ? { sortOrder: Number(payload.sortOrder) || 0 } : {}),
  };

  const existing = await prisma.course.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'COURSE_NOT_FOUND', `Course ${id} not found.`);

  if (Object.keys(data).length === 0) return existing;

  return prisma.course.update({ where: { id }, data });
}

export async function deleteCourse(config: AppConfig, id: string) {
  if (!id) throw new HttpError(400, 'ID_REQUIRED', 'Course ID is required.');

  const existing = await prisma.course.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'COURSE_NOT_FOUND', `Course ${id} not found.`);

  return prisma.course.update({
    where: { id },
    data: { status: 'archived' },
  });
}
