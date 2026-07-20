import { HttpError } from '#http/errors.js';
import { findRecord } from '#db/pgAdapter.js';

export async function getTicketWithMessages(config, actor, ticketId) {
  const { item: ticket, store } = await findRecord(config, 'supportTickets', (t) => t.id === ticketId);
  if (!ticket) {
    throw new HttpError(404, 'TICKET_NOT_FOUND', 'Support ticket not found.');
  }

  if (ticket.userId !== actor?.userId) {
    throw new HttpError(403, 'FORBIDDEN', 'Ticket does not belong to you.');
  }

  const messages = (store.supportTicketMessages || [])
    .filter((m) => m.ticketId === ticketId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return { ticket, messages };
}
