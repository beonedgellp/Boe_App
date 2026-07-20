import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../security/auth.js';

export const adminRouter = Router();

const ADMIN_ROLES = ['admin'];

// All admin routes require admin role
adminRouter.use(requireAuth({ roles: ADMIN_ROLES }));

// Overview
adminRouter.get('/overview', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { totalUsers: 0, totalPayments: 0, pendingApprovals: 0 } }); } catch (err) { next(err); }
});

adminRouter.get('/stats/pending', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { pending: 0 } }); } catch (err) { next(err); }
});

// Users
adminRouter.get('/users', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { items: [], count: 0 } }); } catch (err) { next(err); }
});
adminRouter.get('/users/:user_id/detail', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: null }); } catch (err) { next(err); }
});
adminRouter.patch('/users/:user_id/status', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { updated: true } }); } catch (err) { next(err); }
});

// Approvals
adminRouter.get('/approvals', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { items: [], count: 0 } }); } catch (err) { next(err); }
});


// KYC Review
adminRouter.get('/kyc-review', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { items: [], count: 0 } }); } catch (err) { next(err); }
});
adminRouter.patch('/kyc-review/:user_id', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { reviewed: true } }); } catch (err) { next(err); }
});

// Products & Funds
adminRouter.get('/products', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { items: [], count: 0 } }); } catch (err) { next(err); }
});
adminRouter.post('/products', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { id: 'placeholder' } }); } catch (err) { next(err); }
});
adminRouter.patch('/products/:product_id', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { updated: true } }); } catch (err) { next(err); }
});
adminRouter.post('/products/:product_id/disclosures', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { id: 'placeholder' } }); } catch (err) { next(err); }
});
adminRouter.post('/products/:product_id/holdings', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { id: 'placeholder' } }); } catch (err) { next(err); }
});

// Funds
adminRouter.get('/funds', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { items: [], count: 0 } }); } catch (err) { next(err); }
});
adminRouter.get('/funds/:fund_id', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: null }); } catch (err) { next(err); }
});
adminRouter.post('/funds', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { id: 'placeholder' } }); } catch (err) { next(err); }
});
adminRouter.patch('/funds/:fund_id', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { updated: true } }); } catch (err) { next(err); }
});
adminRouter.delete('/funds/:fund_id', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { deleted: true } }); } catch (err) { next(err); }
});
adminRouter.post('/funds/:fund_id/allocate', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { allocated: true } }); } catch (err) { next(err); }
});
adminRouter.post('/funds/:fund_id/unallocate', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { unallocated: true } }); } catch (err) { next(err); }
});
adminRouter.post('/funds/:fund_id/outflow', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { outflow: true } }); } catch (err) { next(err); }
});
adminRouter.post('/funds/:fund_id/inflow', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { inflow: true } }); } catch (err) { next(err); }
});


// Payments
adminRouter.get('/payments', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { items: [], count: 0 } }); } catch (err) { next(err); }
});
adminRouter.post('/payments/:payment_id/reconcile', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { reconciled: true } }); } catch (err) { next(err); }
});
adminRouter.post('/payments/:payment_id/approve', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { approved: true } }); } catch (err) { next(err); }
});
adminRouter.post('/payments/:payment_id/reject', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { rejected: true } }); } catch (err) { next(err); }
});

// Mandates
adminRouter.get('/mandates', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { items: [], count: 0 } }); } catch (err) { next(err); }
});
adminRouter.patch('/mandates/:mandate_id', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { updated: true } }); } catch (err) { next(err); }
});

// SIP Control
adminRouter.get('/sip-control-requests', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { items: [], count: 0 } }); } catch (err) { next(err); }
});
adminRouter.patch('/sip-control-requests/:request_id', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { reviewed: true } }); } catch (err) { next(err); }
});

// Transactions
adminRouter.get('/transactions', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { items: [], count: 0 } }); } catch (err) { next(err); }
});

// Audit Logs
adminRouter.get('/audit-logs', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { items: [], count: 0 } }); } catch (err) { next(err); }
});

// Support
adminRouter.get('/support/tickets', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { items: [], count: 0 } }); } catch (err) { next(err); }
});
adminRouter.post('/support/tickets/:ticket_id/reply', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { replied: true } }); } catch (err) { next(err); }
});

// App Config
adminRouter.get('/app-config', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: {} }); } catch (err) { next(err); }
});
adminRouter.patch('/app-config', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { published: true } }); } catch (err) { next(err); }
});

// Landing Config
adminRouter.get('/landing-config', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: {} }); } catch (err) { next(err); }
});
adminRouter.patch('/landing-config', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { published: true } }); } catch (err) { next(err); }
});


// Notifications
adminRouter.get('/notifications', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { items: [], count: 0 } }); } catch (err) { next(err); }
});
adminRouter.post('/notifications', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { sent: true } }); } catch (err) { next(err); }
});

// FAQs
adminRouter.get('/faqs', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { items: [] } }); } catch (err) { next(err); }
});
adminRouter.post('/faqs', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { id: 'placeholder' } }); } catch (err) { next(err); }
});
adminRouter.patch('/faqs/:faq_id', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { updated: true } }); } catch (err) { next(err); }
});
adminRouter.delete('/faqs/:faq_id', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { deleted: true } }); } catch (err) { next(err); }
});

// Courses
adminRouter.get('/courses', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { items: [] } }); } catch (err) { next(err); }
});
adminRouter.post('/courses', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { id: 'placeholder' } }); } catch (err) { next(err); }
});
adminRouter.patch('/courses/:course_id', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { updated: true } }); } catch (err) { next(err); }
});
adminRouter.delete('/courses/:course_id', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { deleted: true } }); } catch (err) { next(err); }
});

// Plans
adminRouter.get('/plans', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { items: [] } }); } catch (err) { next(err); }
});
adminRouter.post('/plans', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { id: 'placeholder' } }); } catch (err) { next(err); }
});
adminRouter.patch('/plans/:plan_id', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { updated: true } }); } catch (err) { next(err); }
});
adminRouter.delete('/plans/:plan_id', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { deleted: true } }); } catch (err) { next(err); }
});

// Redemption Requests
adminRouter.get('/redemption-requests', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { items: [], count: 0 } }); } catch (err) { next(err); }
});
adminRouter.patch('/redemption-requests/:request_id', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { processed: true } }); } catch (err) { next(err); }
});

// Capital Transactions
adminRouter.get('/capital-transactions', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { items: [], count: 0 } }); } catch (err) { next(err); }
});

// Reconciliation Ledger
adminRouter.get('/reconciliation-ledger', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { items: [], count: 0 } }); } catch (err) { next(err); }
});

// Risk Profiles
adminRouter.get('/risk-profiles', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { items: [], count: 0 } }); } catch (err) { next(err); }
});

// Receipts & Timeline (admin)
adminRouter.get('/receipts', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { items: [] } }); } catch (err) { next(err); }
});
adminRouter.get('/users/:userId/timeline', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { items: [] } }); } catch (err) { next(err); }
});

// Internal routes
adminRouter.get('/routes', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { routes: [] } }); } catch (err) { next(err); }
});
