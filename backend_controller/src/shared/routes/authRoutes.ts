import { Routes } from './constants.js';
import { login, logout, refreshSession, session, signup } from '../services/authService.js';
import { validateBody } from '#http/validate.js';

const ACCESS_COOKIE_MAX_AGE_SECONDS = 24 * 60 * 60;
const REFRESH_COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

export function registerAuthRoutes(router) {
  router.post(Routes.POST_V1_AUTH_LOGIN, {
    group: 'auth',
    auth: false,
    description: 'Create an access/refresh token pair after approved-user checks.',
  }, async ({ body, config, headers }) => {
    validateBody(body, {
      identifier: { required: true, type: 'string', minLength: 1 },
      password: { required: true, type: 'string', minLength: 1 },
    });
    const result = await login(body, config, { headers });
    return {
      status: 200,
      body: { user: result.user, accessToken: result.accessToken, refreshToken: result.refreshToken },
      cookies: [
        { name: 'access_token', value: result.accessToken, httpOnly: true, sameSite: 'Strict', path: '/', maxAge: ACCESS_COOKIE_MAX_AGE_SECONDS },
        { name: 'refresh_token', value: result.refreshToken, httpOnly: true, sameSite: 'Strict', path: '/', maxAge: REFRESH_COOKIE_MAX_AGE_SECONDS },
      ],
    };
  });

  router.post(Routes.POST_V1_AUTH_SIGNUP, {
    group: 'auth',
    auth: false,
    description: 'Create a simple client account from website signup.',
  }, async ({ body, config, headers }) => {
    validateBody(body, {
      name: { required: true, type: 'string', minLength: 1 },
      username: { required: true, type: 'string', minLength: 3 },
      email: { required: true, type: 'string', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
      phone: { required: true, type: 'string', minLength: 6 },
      password: { required: true, type: 'string', minLength: 8 },
    });
    const result = await signup(body, config, { headers });
    return {
      status: 200,
      body: { user: result.user, accessToken: result.accessToken, refreshToken: result.refreshToken },
      cookies: [
        { name: 'access_token', value: result.accessToken, httpOnly: true, sameSite: 'Strict', path: '/', maxAge: ACCESS_COOKIE_MAX_AGE_SECONDS },
        { name: 'refresh_token', value: result.refreshToken, httpOnly: true, sameSite: 'Strict', path: '/', maxAge: REFRESH_COOKIE_MAX_AGE_SECONDS },
      ],
    };
  });

  router.post(Routes.POST_V1_AUTH_LOGOUT, {
    group: 'auth',
    roles: ['client', 'admin'],
    allowDisabledAccount: true,
    description: 'Revoke the active device session.',
  }, ({ actor, config }) => {
    logout(actor, config);
    return {
      status: 200,
      body: { ok: true },
      cookies: [
        { name: 'access_token', value: '', httpOnly: true, sameSite: 'Strict', path: '/', maxAge: 0 },
        { name: 'refresh_token', value: '', httpOnly: true, sameSite: 'Strict', path: '/', maxAge: 0 },
      ],
    };
  });

  router.post(Routes.POST_V1_AUTH_REFRESH, {
    group: 'auth',
    auth: false,
    description: 'Rotate a refresh token and return a fresh access token.',
  }, async ({ body, config, headers }) => {
    const cookieHeader = headers?.cookie || '';
    const cookieMatch = cookieHeader.match(/(?:^|;\s*)refresh_token=([^;]+)/);
    const cookieRefreshToken = cookieMatch ? decodeURIComponent(cookieMatch[1]) : '';
    const refreshToken = body?.refreshToken || cookieRefreshToken;

    const result = await refreshSession({ refreshToken }, config);
    return {
      status: 200,
      body: { user: result.user, accessToken: result.accessToken, refreshToken: result.refreshToken },
      cookies: [
        { name: 'access_token', value: result.accessToken, httpOnly: true, sameSite: 'Strict', path: '/', maxAge: ACCESS_COOKIE_MAX_AGE_SECONDS },
        { name: 'refresh_token', value: result.refreshToken, httpOnly: true, sameSite: 'Strict', path: '/', maxAge: REFRESH_COOKIE_MAX_AGE_SECONDS },
      ],
    };
  });

  router.get(Routes.GET_V1_AUTH_SESSION, {
    group: 'auth',
    auth: false,
    description: 'Return current session status when a bearer token is present.',
  }, ({ actor }) => session(actor));
}
