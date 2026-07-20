// Augment Node's IncomingMessage with the fields the app attaches to it.
import 'node:http';

declare module 'node:http' {
  interface IncomingMessage {
    /** Raw request body text, captured by readJsonBody for webhook signature checks. */
    rawBody?: string;
  }
}
