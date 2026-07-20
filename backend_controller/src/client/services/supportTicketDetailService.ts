import type { AppConfig, Actor, UnknownRecord, StoreRecord } from '#types/index.js';
import { HttpError } from '#http/errors.js';
import { prisma } from '#db/prisma.js';

export async function getTicketWithMessages(config: AppConfig, actor: Actor, ticketId: string) {
  const ticket = await prisma.supportTicket.findFirst({ where: { id: ticketId } });
  if (!ticket) {
    throw new HttpError(404, 'TICKET_NOT_FOUND', 'Support ticket not found.');
  }

  if (ticket.userId !== actor?.userId) {
    throw new HttpError(403, 'FORBIDDEN', 'Ticket does not belong to you.');
  }

  const messages = await prisma.supportTicketMessage.findMany({
    where: { ticketId },
    orderBy: { createdAt: 'asc' },
  });

  return { ticket, messages };
}
