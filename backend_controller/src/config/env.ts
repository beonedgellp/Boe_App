import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenvConfig({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().positive().default(47500),
  DATABASE_URL: z.string().default(''),
  ACCESS_TOKEN_SECRET: z.string().default(''),
  REFRESH_TOKEN_SECRET: z.string().default(''),
  CORS_ORIGIN: z.string().default('http://127.0.0.1:5173,http://localhost:5173'),
  ALLOW_DEV_AUTH: z.string().default('false'),
  ADMIN_LOGIN_ID: z.string().default(''),
  ADMIN_PASSWORD: z.string().default(''),
  ADMIN_FIRST_NAME: z.string().default('BeOnEdge'),
  ADMIN_LAST_NAME: z.string().default('Admin'),
  ADMIN_PHONE: z.string().default(''),
  ADMIN_USER_ID: z.string().default('00000000-0000-4000-8000-000000000001'),
  PROVIDER_MODE: z.string().default('development'),
  RAZORPAY_KEY_ID: z.string().default(''),
  RAZORPAY_KEY_SECRET: z.string().default(''),
  RAZORPAY_WEBHOOK_SECRET: z.string().default(''),
  SIGNUP_ALLOWED_ORIGIN: z.string().default(''),
  SIGNUP_PROXY_SECRET: z.string().default(''),
});


const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const env = parsed.data;

export interface AppConfig {
  nodeEnv: string;
  host: string;
  port: number;
  databaseUrl: string;
  accessTokenSecret: string;
  refreshTokenSecret: string;
  corsOrigins: string[];
  allowDevAuth: boolean;
  adminLoginId: string;
  adminPassword: string;
  adminFirstName: string;
  adminLastName: string;
  adminPhone: string;
  adminUserId: string;
  providerMode: string;
  razorpayKeyId: string;
  razorpayKeySecret: string;
  razorpayWebhookSecret: string;
  signupAllowedOrigin: string;
  signupProxySecret: string;
}

export const config: AppConfig = {
  nodeEnv: env.NODE_ENV,
  host: env.HOST,
  port: env.PORT,
  databaseUrl: env.DATABASE_URL,
  accessTokenSecret: env.ACCESS_TOKEN_SECRET,
  refreshTokenSecret: env.REFRESH_TOKEN_SECRET,
  corsOrigins: env.CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean),
  allowDevAuth: ['1', 'true', 'yes'].includes(env.ALLOW_DEV_AUTH.toLowerCase()),
  adminLoginId: env.ADMIN_LOGIN_ID,
  adminPassword: env.ADMIN_PASSWORD,
  adminFirstName: env.ADMIN_FIRST_NAME,
  adminLastName: env.ADMIN_LAST_NAME,
  adminPhone: env.ADMIN_PHONE,
  adminUserId: env.ADMIN_USER_ID,
  providerMode: env.PROVIDER_MODE,
  razorpayKeyId: env.RAZORPAY_KEY_ID,
  razorpayKeySecret: env.RAZORPAY_KEY_SECRET,
  razorpayWebhookSecret: env.RAZORPAY_WEBHOOK_SECRET,
  signupAllowedOrigin: env.SIGNUP_ALLOWED_ORIGIN,
  signupProxySecret: env.SIGNUP_PROXY_SECRET,
};
