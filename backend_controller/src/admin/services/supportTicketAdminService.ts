import type { AppConfig, Actor, UnknownRecord, StoreRecord } from '#types/index.js';
import { randomUUID } from 'node:crypto';
import { HttpError } from '#http/errors.js';
import { prisma } from '#db/prisma.js';

export async function replyToTicket(config: AppConfig, actor: Actor, ticketId: string, body: Record<string, unknown>) {
  const message = String(body?.message || '').trim();
  if (!message) {
    throw new HttpError(400, 'MESSAGE_REQUIRED', 'Reply message is required.');
  }

  const ticket = await prisma.supportTicket.findFirst({ where: { id: ticketId } });
  if (!ticket) {
    throw new HttpError(404, 'TICKET_NOT_FOUND', 'Support ticket not found.');
  }

  const now = new Date();

  const [reply, updatedTicket] = await prisma.$transaction(async (tx) => {
    const reply = await tx.supportTicketMessage.create({
      data: {
        id: randomUUID(),
        ticketId,
        authorId: actor?.userId || null,
        authorRole: 'admin',
        body: message,
      },
    });

    const newStatus = ticket.status === 'open' ? 'in_progress' : ticket.status;
    const updatedTicket = await tx.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: newStatus,
        updatedAt: now,
      },
    });

    await tx.adminAuditLog.create({
      data: {
        id: randomUUID(),
        adminId: actor?.userId || null,
        action: 'support_ticket.reply',
        entityType: 'support_ticket',
        entityId: ticketId,
        beforeJson: { status: ticket.status },
        afterJson: { status: newStatus },
        reason: `Admin replied to support ticket`,
      },
    });

    return [reply, updatedTicket];
  });

  return { reply, ticket: updatedTicket };
}
