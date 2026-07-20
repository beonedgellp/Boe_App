import { Router, Request, Response, NextFunction } from 'express';
import { validateBody } from '../../http/middleware.js';
import {
  onboardingApplicationSchema,
  onboardingRiskProfileSchema,
  onboardingKycDocumentsSchema,
} from '../../http/schemas.js';

export const publicRouter = Router();

// Onboarding
publicRouter.post('/applications', validateBody(onboardingApplicationSchema), async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { submitted: true, onboardingSessionId: 'placeholder' } }); } catch (err) { next(err); }
});

publicRouter.post('/risk-profile', validateBody(onboardingRiskProfileSchema), async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { submitted: true } }); } catch (err) { next(err); }
});

publicRouter.post('/kyc-documents', validateBody(onboardingKycDocumentsSchema), async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { submitted: true } }); } catch (err) { next(err); }
});

// Public products
publicRouter.get('/products', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { items: [], count: 0 } }); } catch (err) { next(err); }
});

// App config
publicRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: {} }); } catch (err) { next(err); }
});

// Landing config
publicRouter.get('/landing-config', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: {} }); } catch (err) { next(err); }
});

// Disclosures
publicRouter.get('/disclosures', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { items: [] } }); } catch (err) { next(err); }
});

// Investor Charter
publicRouter.get('/investor-charter', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: {} }); } catch (err) { next(err); }
});

// Grievance
publicRouter.get('/grievance', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: {} }); } catch (err) { next(err); }
});

// Courses
publicRouter.get('/courses', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { items: [] } }); } catch (err) { next(err); }
});

// Plans
publicRouter.get('/plans', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ ok: true, data: { items: [] } }); } catch (err) { next(err); }
});
