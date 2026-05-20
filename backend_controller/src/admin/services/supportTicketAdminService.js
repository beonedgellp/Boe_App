import { randomUUID } from 'node:crypto';
import { HttpError } from '../../http/errors.js';
import { jsonStoreEnabled, updateJsonStore } from '../../db/jsonStore.js';

export async function replyToTicket(config, actor, ticketId, body) {
  if (!jsonStoreEnabled(config)) {
    throw new HttpError(503, 'DATABASE_NOT_CONFIGURED', 'PostgreSQL persistence for support tickets is not yet implemented.');
  }

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
