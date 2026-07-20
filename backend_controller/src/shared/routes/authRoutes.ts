import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../security/auth.js';
import { validateBody } from '../../http/middleware.js';
import { loginSchema, signupSchema, refreshSchema } from '../../http/schemas.js';
import { login, signup, logout, refreshSession, session } from '../services/authService.js';
import { config } from '../../config/env.js';

export const authRouter = Router();

const ACCESS_COOKIE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const REFRESH_COOKIE_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie('access_token', accessToken, {
    httpOnly: true, sameSite: 'strict', path: '/', maxAge: ACCESS_COOKIE_MAX_AGE_MS,
  });
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true, sameSite: 'strict', path: '/', maxAge: REFRESH_COOKIE_MAX_AGE_MS,
  });
}

function clearAuthCookies(res: Response): void {
  res.clearCookie('access_token', { path: '/' });
  res.clearCookie('refresh_token', { path: '/' });
}


authRouter.post('/login', validateBody(loginSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await login(req.body, config, { headers: req.headers });
    setAuthCookies(res, result.accessToken, result.refreshToken);
    res.json({ ok: true, data: { user: result.user, accessToken: result.accessToken, refreshToken: result.refreshToken } });
  } catch (err) { next(err); }
});

authRouter.post('/signup', validateBody(signupSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await signup(req.body, config, { headers: req.headers });
    setAuthCookies(res, result.accessToken, result.refreshToken);
    res.json({ ok: true, data: { user: result.user, accessToken: result.accessToken, refreshToken: result.refreshToken } });
  } catch (err) { next(err); }
});

authRouter.post('/logout', requireAuth({ roles: ['client', 'admin'], allowDisabledAccount: true }), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await logout(req.actor!, config);
    clearAuthCookies(res);
    res.json({ ok: true, data: { ok: true } });
  } catch (err) { next(err); }
});

authRouter.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.body?.refreshToken || req.cookies?.refresh_token || '';
    const result = await refreshSession({ refreshToken }, config);
    setAuthCookies(res, result.accessToken, result.refreshToken);
    res.json({ ok: true, data: { user: result.user, accessToken: result.accessToken, refreshToken: result.refreshToken } });
  } catch (err) { next(err); }
});

authRouter.get('/session', (req: Request, res: Response) => {
  const data = session(req.actor || null);
  res.json({ ok: true, data });
});
