import type { RequestContext } from '#types/services.js';
import type { AppConfig, Actor, UnknownRecord, StoreRecord } from '#types/index.js';
import { randomUUID } from 'node:crypto';
import { HttpError } from '#http/errors.js';
import { prisma } from '#db/prisma.js';

export async function listAdminFaqs(config: AppConfig) {
  const items = await prisma.faq.findMany({
    orderBy: { displayOrder: 'asc' },
  });
  return { items, count: items.length };
}

export async function createFaq(config: AppConfig, actor: Actor, body: Record<string, unknown>) {
  const question = String(body?.question || '').trim();
  const answer = String(body?.answer || '').trim();
  const category = String(body?.category || 'general').trim();

  if (!question) throw new HttpError(400, 'QUESTION_REQUIRED', 'FAQ question is required.');
  if (!answer) throw new HttpError(400, 'ANSWER_REQUIRED', 'FAQ answer is required.');

  const faq = await prisma.faq.create({
    data: {
      id: randomUUID(),
      question,
      answer,
      category,
      displayOrder: Number(body?.order) || 0,
      active: true,
    },
  });

  return faq;
}

export async function updateFaq(config: AppConfig, actor: Actor, faqId: any, body: Record<string, unknown>) {
  const existing = await prisma.faq.findFirst({ where: { id: faqId } });
  if (!existing) throw new HttpError(404, 'FAQ_NOT_FOUND', 'FAQ not found.');

  const data: Record<string, any> = {};

  if (body.question !== undefined) data.question = String(body.question).trim();
  if (body.answer !== undefined) data.answer = String(body.answer).trim();
  if (body.category !== undefined) data.category = String(body.category).trim();
  if (body.order !== undefined) data.displayOrder = Number(body.order);
  if (body.status !== undefined) {
    const newStatus = String(body.status).trim().toLowerCase();
    if (['published', 'draft'].includes(newStatus)) {
      data.active = newStatus === 'published';
    }
  }

  const updated = await prisma.faq.update({
    where: { id: faqId },
    data,
  });

  return updated;
}

export async function deleteFaq(config: AppConfig, actor: Actor, faqId: any) {
  const existing = await prisma.faq.findFirst({ where: { id: faqId } });
  if (!existing) throw new HttpError(404, 'FAQ_NOT_FOUND', 'FAQ not found.');

  await prisma.faq.delete({ where: { id: faqId } });
  return { deleted: true };
}
