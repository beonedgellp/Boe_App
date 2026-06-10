import { randomUUID } from 'node:crypto';
import { HttpError } from '#http/errors.js';
import { jsonStoreEnabled, readJsonStore, updateJsonStore } from '#db/jsonStore.js';
import { query } from '#db/client.js';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function toTrimmedString(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
}

function validateSlug(slug) {
  if (!SLUG_PATTERN.test(slug)) {
    throw new HttpError(400, 'INVALID_SLUG', 'Slug must be lowercase alphanumeric with hyphens.');
  }
}

function rowToCourse(row) {
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    level: row.level,
    format: row.format,
    outcome: row.outcome,
    description: row.description,
    pricePaise: row.price_paise,
    status: row.status,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function sortCourses(items) {
  return items.sort((a, b) => {
    const sortDiff = (a.sortOrder || 0) - (b.sortOrder || 0);
    if (sortDiff !== 0) return sortDiff;
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });
}

export async function listCourses(config, opts = {}) {
  if (jsonStoreEnabled(config)) {
    const store = await readJsonStore(config);
    let items = Array.isArray(store.courses) ? store.courses : [];
    items = items.filter((c) => c.status === 'published');
    return { items: sortCourses(items), count: items.length, source: 'json' };
  }

  const result = await query(config, `
    SELECT * FROM courses
    WHERE status = 'published'
    ORDER BY sort_order ASC, created_at DESC
  `);
  const items = result.rows.map(rowToCourse);
  return { items, count: items.length, source: 'postgres' };
}

export async function listAdminCourses(config) {
  if (jsonStoreEnabled(config)) {
    const store = await readJsonStore(config);
    const items = Array.isArray(store.courses) ? store.courses : [];
    return { items: sortCourses(items), count: items.length, source: 'json' };
  }

  const result = await query(config, `
    SELECT * FROM courses
    ORDER BY sort_order ASC, created_at DESC
  `);
  const items = result.rows.map(rowToCourse);
  return { items, count: items.length, source: 'postgres' };
}

export async function createCourse(config, body) {
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

  const now = new Date().toISOString();
  const course = {
    id: randomUUID(),
    slug,
    name,
    level,
    format,
    outcome,
    description: payload.description !== undefined ? toTrimmedString(payload.description) : null,
    pricePaise: payload.pricePaise !== undefined ? Number(payload.pricePaise) || null : null,
    status: 'draft',
    sortOrder: Number(payload.sortOrder) || 0,
    createdAt: now,
    updatedAt: now,
  };

  if (jsonStoreEnabled(config)) {
    await updateJsonStore(config, (store) => {
      if (!Array.isArray(store.courses)) store.courses = [];
      store.courses.push(course);
      return course;
    });
    return course;
  }

  const result = await query(config, `
    INSERT INTO courses (id, slug, name, level, format, outcome, description, price_paise, status, sort_order, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *
  `, [
    course.id, course.slug, course.name, course.level, course.format, course.outcome,
    course.description, course.pricePaise, course.status, course.sortOrder, course.createdAt, course.updatedAt,
  ]);
  return rowToCourse(result.rows[0]);
}

export async function updateCourse(config, id, body) {
  if (!id) throw new HttpError(400, 'ID_REQUIRED', 'Course ID is required.');
  const payload = body && typeof body === 'object' ? body : {};

  if (jsonStoreEnabled(config)) {
    const updated = await updateJsonStore(config, (store) => {
      const idx = (store.courses || []).findIndex((c) => c.id === id);
      if (idx === -1) return null;
      const existing = store.courses[idx];
      const now = new Date().toISOString();

      const next = { ...existing };
      if (payload.slug !== undefined) next.slug = toTrimmedString(payload.slug);
      if (payload.name !== undefined) next.name = toTrimmedString(payload.name);
      if (payload.level !== undefined) next.level = toTrimmedString(payload.level);
      if (payload.format !== undefined) next.format = toTrimmedString(payload.format);
      if (payload.outcome !== undefined) next.outcome = toTrimmedString(payload.outcome);
      if (payload.description !== undefined) next.description = toTrimmedString(payload.description);
      if (payload.pricePaise !== undefined) next.pricePaise = Number(payload.pricePaise) || null;
      if (payload.status !== undefined) next.status = toTrimmedString(payload.status);
      if (payload.sortOrder !== undefined) next.sortOrder = Number(payload.sortOrder) || 0;
      next.updatedAt = now;

      store.courses[idx] = next;
      return next;
    });
    if (!updated) throw new HttpError(404, 'COURSE_NOT_FOUND', `Course ${id} not found.`);
    return updated;
  }

  const fields = [];
  const values = [];
  let i = 1;

  if (payload.slug !== undefined) { fields.push(`slug = $${i++}`); values.push(toTrimmedString(payload.slug)); }
  if (payload.name !== undefined) { fields.push(`name = $${i++}`); values.push(toTrimmedString(payload.name)); }
  if (payload.level !== undefined) { fields.push(`level = $${i++}`); values.push(toTrimmedString(payload.level)); }
  if (payload.format !== undefined) { fields.push(`format = $${i++}`); values.push(toTrimmedString(payload.format)); }
  if (payload.outcome !== undefined) { fields.push(`outcome = $${i++}`); values.push(toTrimmedString(payload.outcome)); }
  if (payload.description !== undefined) { fields.push(`description = $${i++}`); values.push(toTrimmedString(payload.description)); }
  if (payload.pricePaise !== undefined) { fields.push(`price_paise = $${i++}`); values.push(Number(payload.pricePaise) || null); }
  if (payload.status !== undefined) { fields.push(`status = $${i++}`); values.push(toTrimmedString(payload.status)); }
  if (payload.sortOrder !== undefined) { fields.push(`sort_order = $${i++}`); values.push(Number(payload.sortOrder) || 0); }

  if (fields.length === 0) {
    const result = await query(config, `SELECT * FROM courses WHERE id = $1`, [id]);
    if (!result.rows[0]) throw new HttpError(404, 'COURSE_NOT_FOUND', `Course ${id} not found.`);
    return rowToCourse(result.rows[0]);
  }

  fields.push(`updated_at = $${i++}`);
  values.push(new Date().toISOString());
  values.push(id);

  const result = await query(config, `
    UPDATE courses SET ${fields.join(', ')} WHERE id = $${i} RETURNING *
  `, values);
  if (!result.rows[0]) throw new HttpError(404, 'COURSE_NOT_FOUND', `Course ${id} not found.`);
  return rowToCourse(result.rows[0]);
}

export async function deleteCourse(config, id) {
  if (!id) throw new HttpError(400, 'ID_REQUIRED', 'Course ID is required.');

  if (jsonStoreEnabled(config)) {
    const updated = await updateJsonStore(config, (store) => {
      const idx = (store.courses || []).findIndex((c) => c.id === id);
      if (idx === -1) return null;
      const existing = store.courses[idx];
      existing.status = 'archived';
      existing.updatedAt = new Date().toISOString();
      return existing;
    });
    if (!updated) throw new HttpError(404, 'COURSE_NOT_FOUND', `Course ${id} not found.`);
    return updated;
  }

  const result = await query(config, `
    UPDATE courses SET status = 'archived', updated_at = now() WHERE id = $1 RETURNING *
  `, [id]);
  if (!result.rows[0]) throw new HttpError(404, 'COURSE_NOT_FOUND', `Course ${id} not found.`);
  return rowToCourse(result.rows[0]);
}
