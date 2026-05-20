import { HttpError } from '../../http/errors.js';
import { jsonStoreEnabled, findRecord } from '../../db/jsonStore.js';

export async function getTicketWithMessages(config, actor, ticketId) {
  if (!jsonStoreEnabled(config)) {
    throw new HttpError(503, 'DATABASE_NOT_CONFIGURED', 'PostgreSQL persistence for support tickets is not yet implemented.');
  }

  const { item: ticket, store } = await findRecord(config, 'supportTickets', (t) => t.id === ticketId);
  if (!ticket) {
    throw new HttpError(404, 'TICKET_NOT_FOUND', 'Support ticket not found.');
  }

  if (ticket.userId !== actor?.userId) {
    throw new HttpError(403, 'FORBIDDEN', 'Ticket does not belong to you.');
  }

  const messages = (store.supportTicketMessages || [])
    .filter((m) => m.ticketId === ticketId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  return { ticket, messages };
}
