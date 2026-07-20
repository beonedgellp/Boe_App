import { randomUUID } from 'node:crypto';
import { HttpError } from '#http/errors.js';
import { readJsonStore, updateJsonStore } from '#db/pgAdapter.js';

export async function listAdminFaqs(config) {
  const store = await readJsonStore(config);
  const items = Array.isArray(store.faqs) ? store.faqs : [];
  return { items, count: items.length };
}

export async function createFaq(config, actor, body) {
  const question = String(body?.question || '').trim();
  const answer = String(body?.answer || '').trim();
  const category = String(body?.category || 'general').trim();

  if (!question) throw new HttpError(400, 'QUESTION_REQUIRED', 'FAQ question is required.');
  if (!answer) throw new HttpError(400, 'ANSWER_REQUIRED', 'FAQ answer is required.');

  const now = new Date().toISOString();
  const faq = {
    id: randomUUID(),
    question,
    answer,
    category,
    order: Number(body?.order) || 0,
    status: 'draft',
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  await updateJsonStore(config, (store) => {
    if (!Array.isArray(store.faqs)) store.faqs = [];
    store.faqs.push(faq);
    return faq;
  });

  return faq;
}

export async function updateFaq(config, actor, faqId, body) {
  const now = new Date().toISOString();

  return updateJsonStore(config, (store) => {
    const idx = (store.faqs || []).findIndex((f) => f.id === faqId);
    if (idx === -1) throw new HttpError(404, 'FAQ_NOT_FOUND', 'FAQ not found.');

    const existing = store.faqs[idx];
    if (body.question !== undefined) existing.question = String(body.question).trim();
    if (body.answer !== undefined) existing.answer = String(body.answer).trim();
    if (body.category !== undefined) existing.category = String(body.category).trim();
    if (body.order !== undefined) existing.order = Number(body.order);
    if (body.status !== undefined) {
      const newStatus = String(body.status).trim().toLowerCase();
      if (['published', 'draft'].includes(newStatus)) {
        existing.status = newStatus;
        if (newStatus === 'published' && existing.status !== 'published') {
          existing.publishedAt = now;
        }
      }
    }
    existing.updatedAt = now;
    return existing;
  });
}

export async function deleteFaq(config, actor, faqId) {
  return updateJsonStore(config, (store) => {
    const idx = (store.faqs || []).findIndex((f) => f.id === faqId);
    if (idx === -1) throw new HttpError(404, 'FAQ_NOT_FOUND', 'FAQ not found.');
    store.faqs.splice(idx, 1);
    return { deleted: true };
  });
}
