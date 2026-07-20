import type { AppConfig, Actor, UnknownRecord, StoreRecord } from '#types/index.js';
import { randomUUID } from 'node:crypto';
import { HttpError } from '#http/errors.js';
import { updateJsonStore } from '#db/pgAdapter.js';

export async function replyToTicket(config: AppConfig, actor: Actor, ticketId: string, body: any) {
  const message = String(body?.message || '').trim();
  if (!message) {
    throw new HttpError(400, 'MESSAGE_REQUIRED', 'Reply message is required.');
  }

  const now = new Date().toISOString();

  return updateJsonStore(config, (store) => {
    const ticket = (store.supportTickets || []).find((t) => t.id === ticketId);
    if (!ticket) {
      throw new HttpError(404, 'TICKET_NOT_FOUND', 'Support ticket not found.');
    }

    const reply = {
      id: randomUUID(),
      ticketId,
      authorId: actor?.userId || 'system',
      authorRole: 'admin',
      body: message,
      createdAt: now,
    };

    if (!Array.isArray(store.supportTicketMessages)) store.supportTicketMessages = [];
    store.supportTicketMessages.push(reply);

    if (ticket.status === 'open') {
      ticket.status = 'in_progress';
    }
    ticket.updatedAt = now;

    const auditLog = {
      id: randomUUID(),
      adminId: actor?.userId || null,
      action: 'support_ticket.reply',
      entityType: 'support_ticket',
      entityId: ticketId,
      before: { status: ticket.status },
      after: { status: ticket.status },
      reason: `Admin replied to support ticket`,
      createdAt: now,
    };
    if (!Array.isArray(store.adminAuditLogs)) store.adminAuditLogs = [];
    store.adminAuditLogs.push(auditLog);

    return { reply, ticket };
  });
}
