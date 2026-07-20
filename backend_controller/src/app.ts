import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { config } from './config/env.js';
import { authenticate } from './security/auth.js';
import { errorHandler } from './http/errorHandler.js';
import { healthRouter } from './shared/routes/healthRoutes.js';
import { authRouter } from './shared/routes/authRoutes.js';
import { clientRouter } from './client/routes/clientRoutes.js';
import { adminRouter } from './admin/routes/adminRoutes.js';
import { publicRouter } from './website/routes/publicRoutes.js';

const app = express();

// --- Industry-standard middleware ---
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
}));


app.use(cors({
  origin: config.corsOrigins.includes('*') ? '*' : config.corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['authorization', 'content-type', 'x-beonedge-signature', 'x-request-id'],
}));

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Rate limiting (replaces hand-rolled in-memory rate limiter)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' } },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' } },
});

const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' } },
});

// Authentication middleware (populates req.actor)
app.use(authenticate);

// --- Routes ---
app.use('/health', healthRouter);
app.use('/v1/health', healthRouter);
app.use('/v1/system', healthRouter);
app.use('/v1/auth', authLimiter, authRouter);
app.use('/v1/onboarding', generalLimiter, publicRouter);
app.use('/v1/public', generalLimiter, publicRouter);
app.use('/v1/app-config', generalLimiter, publicRouter);
app.use('/v1/client', generalLimiter, clientRouter);
app.use('/v1/products', generalLimiter, clientRouter);
app.use('/v1/admin', generalLimiter, adminRouter);
app.use('/v1/webhooks', generalLimiter, publicRouter);
app.use('/v1/internal', generalLimiter, adminRouter);

// Error handler (must be last)
app.use(errorHandler);

export default app;
