import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../security/auth.js';
import { validateBody } from '../../http/middleware.js';
import {
  createSipSchema,
  createLumpsumOrderSchema,
  confirmRazorpaySchema,
  sipControlRequestSchema,
  createTicketSchema,
  createRedemptionSchema,
  withdrawalRedemptionSchema,
} from '../../http/schemas.js';

export const clientRouter = Router();

const CLIENT_ROLES = ['client', 'admin'];

// All client routes require auth
clientRouter.use(requireAuth({ roles: CLIENT_ROLES, group: 'client', allowPendingClient: true }));

// Dashboard
clientRouter.get('/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ ok: true, data: { items: [], count: 0 } });
  } catch (err) { next(err); }
});

// Portfolio
clientRouter.get('/portfolio', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ ok: true, data: { items: [], totalValue: 0, investedValue: 0 } });
  } catch (err) { next(err); }
});

clientRouter.get('/portfolio/holdings/:fund_id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ ok: true, data: null });
  } catch (err) { next(err); }
});

// Research context
clientRouter.get('/research-context', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ ok: true, data: { items: [] } });
  } catch (err) { next(err); }
});


// Orders
clientRouter.get('/orders', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { items: [], count: 0 } }); } catch (err) { next(err); }
});
clientRouter.get('/orders/:order_id', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: null }); } catch (err) { next(err); }
});

// SIPs
clientRouter.post('/sips', requireAuth({ roles: CLIENT_ROLES, group: 'client' }), validateBody(createSipSchema), async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { id: 'placeholder', status: 'submitted' } }); } catch (err) { next(err); }
});

// Lumpsum orders
clientRouter.post('/lumpsum-orders', requireAuth({ roles: CLIENT_ROLES, group: 'client' }), validateBody(createLumpsumOrderSchema), async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { id: 'placeholder', status: 'submitted' } }); } catch (err) { next(err); }
});

// Payments
clientRouter.get('/payments', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { items: [], count: 0 } }); } catch (err) { next(err); }
});
clientRouter.get('/payments/:payment_id', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: null }); } catch (err) { next(err); }
});
clientRouter.post('/payments/:payment_id/confirm-razorpay', requireAuth({ roles: CLIENT_ROLES, group: 'client' }), validateBody(confirmRazorpaySchema), async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { status: 'confirmed' } }); } catch (err) { next(err); }
});
clientRouter.post('/payments/:payment_id/retry', requireAuth({ roles: CLIENT_ROLES, group: 'client' }), async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { status: 'retried' } }); } catch (err) { next(err); }
});


// Mandates
clientRouter.get('/mandates', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { items: [], count: 0 } }); } catch (err) { next(err); }
});
clientRouter.get('/mandates/:mandate_id', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: null }); } catch (err) { next(err); }
});
clientRouter.post('/mandates/:mandate_id/authorize', requireAuth({ roles: CLIENT_ROLES, group: 'client' }), async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { status: 'authorization_started' } }); } catch (err) { next(err); }
});

// SIP Control
clientRouter.post('/sip-control-requests', requireAuth({ roles: CLIENT_ROLES, group: 'client' }), validateBody(sipControlRequestSchema), async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { id: 'placeholder', status: 'pending' } }); } catch (err) { next(err); }
});
clientRouter.get('/sip-control-requests', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { items: [], count: 0 } }); } catch (err) { next(err); }
});

// Transactions
clientRouter.get('/transactions', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { items: [], count: 0 } }); } catch (err) { next(err); }
});
clientRouter.get('/transactions/:transaction_id', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: null }); } catch (err) { next(err); }
});

// Statements
clientRouter.get('/statements', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { items: [], count: 0 } }); } catch (err) { next(err); }
});
clientRouter.get('/statements/:statement_id', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: null }); } catch (err) { next(err); }
});

// Notifications
clientRouter.get('/notifications', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { items: [], count: 0 } }); } catch (err) { next(err); }
});
clientRouter.patch('/notifications/:notification_id', requireAuth({ roles: CLIENT_ROLES, group: 'client' }), async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { read: true } }); } catch (err) { next(err); }
});


// KYC
clientRouter.get('/kyc-status', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { status: 'pending' } }); } catch (err) { next(err); }
});
clientRouter.post('/kyc-depth', requireAuth({ roles: CLIENT_ROLES, group: 'client', allowPendingClient: true }), async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { updated: true } }); } catch (err) { next(err); }
});

// Support
clientRouter.get('/support/faqs', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { items: [] } }); } catch (err) { next(err); }
});
clientRouter.get('/support/tickets', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { items: [], count: 0 } }); } catch (err) { next(err); }
});
clientRouter.post('/support/tickets', requireAuth({ roles: CLIENT_ROLES, group: 'client' }), validateBody(createTicketSchema), async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { id: 'placeholder', status: 'open' } }); } catch (err) { next(err); }
});
clientRouter.get('/support/tickets/:ticket_id', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: null }); } catch (err) { next(err); }
});

// Withdrawals / Redemptions
clientRouter.get('/withdrawals/preview', requireAuth({ roles: CLIENT_ROLES, group: 'client' }), async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: null }); } catch (err) { next(err); }
});
clientRouter.post('/withdrawals', requireAuth({ roles: CLIENT_ROLES, group: 'client' }), validateBody(withdrawalRedemptionSchema), async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { id: 'placeholder', status: 'pending' } }); } catch (err) { next(err); }
});
clientRouter.post('/redemptions', requireAuth({ roles: CLIENT_ROLES, group: 'client' }), validateBody(createRedemptionSchema), async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { id: 'placeholder', status: 'pending' } }); } catch (err) { next(err); }
});
clientRouter.get('/redemptions', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { items: [], count: 0 } }); } catch (err) { next(err); }
});

// Receipts & Timeline
clientRouter.get('/receipts', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { items: [] } }); } catch (err) { next(err); }
});
clientRouter.get('/receipts/:receiptId', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: null }); } catch (err) { next(err); }
});
clientRouter.get('/me/timeline', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { items: [] } }); } catch (err) { next(err); }
});
clientRouter.get('/me/timeline/next-step', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: null }); } catch (err) { next(err); }
});
