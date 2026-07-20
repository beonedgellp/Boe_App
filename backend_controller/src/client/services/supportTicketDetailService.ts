import type { AppConfig, Actor, UnknownRecord, StoreRecord } from '#types/index.js';
import { HttpError } from '#http/errors.js';
import { findRecord } from '#db/pgAdapter.js';

export async function getTicketWithMessages(config: AppConfig, actor: Actor, ticketId: string) {
  const { item: ticket, store } = await findRecord(config, 'supportTickets', (t) => t.id === ticketId);
  if (!ticket) {
    throw new HttpError(404, 'TICKET_NOT_FOUND', 'Support ticket not found.');
  }

  if (ticket.userId !== actor?.userId) {
    throw new HttpError(403, 'FORBIDDEN', 'Ticket does not belong to you.');
  }

  const messages = ((store as any)?.supportTicketMessages || [])
    .filter((m: any) => m.ticketId === ticketId)
    .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return { ticket, messages };
}
