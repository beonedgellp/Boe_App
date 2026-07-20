import { Router, Request, Response } from 'express';
import { config } from '../../config/env.js';

export const healthRouter = Router();

healthRouter.get('/', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    data: {
      status: 'healthy',
      version: '0.2.0',
      environment: config.nodeEnv,
      uptime: process.uptime(),
    },
  });
});

healthRouter.get('/reachability', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    data: { ok: true, minVersion: '1.0.0' },
  });
});
