// Central domain type definitions for the BeOnEdge backend.
//
// These are the real, hand-written types the codebase is built on. External
// I/O boundaries (raw parsed JSON request bodies) are intentionally typed as
// `unknown`/`JsonValue` and narrowed by services; everything the domain owns
// (config, actors, sessions, route contracts, DB rows) is fully typed.

// -------------------- primitives --------------------

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

/** A loosely-shaped record used for dynamic request payloads and DB rows. */
export type UnknownRecord = Record<string, unknown>;

// -------------------- configuration --------------------

export type ProviderMode = 'development' | 'staging' | 'live' | 'razorpay' | 'mock';

export interface AppConfig {
  nodeEnv: string;
  host: string;
  port: number;
  logLevel: LogLevel;
  databaseUrl: string;
  databaseHost: string;
  databasePort: number;
  databaseName: string;
  databaseUser: string;
  databasePassword: string;
  databaseSsl: boolean;
  pgSsl: boolean;
  dbDriver: 'pg';
  dataStore: 'postgres';
  dbPoolMax: number;
  dbConnectionTimeoutMs: number;
  dbIdleTimeoutMs: number;
  migrationsDir: string;
  providerMode: ProviderMode;
  corsOrigins: string[];
  accessTokenSecret: string;
  refreshTokenSecret: string;
  allowDevAuth: boolean;
  adminLoginId: string;
  adminPassword: string;
  adminFirstName: string;
  adminLastName: string;
  adminPhone: string;
  adminUserId: string;
  signupAllowedOrigin: string;
  signupProxySecret: string;
  mockWebhookEnabled: boolean;
  razorpayKeyId: string;
  razorpayKeySecret: string;
  razorpayWebhookSecret: string;
}

// -------------------- logging --------------------

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogMeta = Record<string, unknown>;
export type LogFn = (message: string, meta?: LogMeta) => void;

export interface Logger {
  debug: LogFn;
  info: LogFn;
  warn: LogFn;
  error: LogFn;
}

// -------------------- identity / auth --------------------

export type Role = 'client' | 'admin';
export type UserStatus =
  | 'draft'
  | 'pending_review'
  | 'kyc_pending'
  | 'approved'
  | 'rejected'
  | 'suspended'
  | 'closed';

/** The authenticated principal derived from a verified access token. */
export interface Actor {
  userId: string;
  role: Role;
  status: string;
  deviceSessionId?: string | null;
}

/** Decoded JWT claims for an access token. */
export interface TokenClaims {
  sub: string;
  role: Role;
  deviceSessionId?: string | null;
  status?: string;
  iss?: string;
  aud?: string;
  iat?: number;
  exp?: number;
  [key: string]: unknown;
}

// -------------------- HTTP routing --------------------

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS';

export interface Cookie {
  name: string;
  value: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
  maxAge?: number;
  path?: string;
}

export interface RouteOptions {
  group?: RouteGroup;
  auth?: boolean;
  roles?: Role[];
  allowPendingClient?: boolean;
  allowDisabledAccount?: boolean;
  description?: string;
}

export type RouteGroup =
  | 'shared'
  | 'website'
  | 'client'
  | 'admin'
  | 'public'
  | 'auth'
  | 'internal'
  | 'provider-webhook';

/** Metadata stored alongside each registered route for introspection/authorization. */
export interface RouteMeta extends Required<Omit<RouteOptions, 'group'>> {
  method: HttpMethod;
  path: string;
  group: RouteGroup;
}

/** Legacy RouteDefinition — kept for backward compat with scripts that call router.describe(). */
export interface RouteDefinition extends RouteMeta {
  keys: string[];
  regex: RegExp;
  handler: RouteHandler;
}

/** A structured handler response; handlers may also return a plain data value. */
export interface HandlerResponse {
  status?: number;
  body?: unknown;
  cookies?: Cookie[];
  headers?: Record<string, string>;
}

export type HandlerResult = HandlerResponse | unknown;

/**
 * The context object passed to every route handler.
 * With Express, this is assembled from req/res in the handler adapter.
 */
export interface RouteContext {
  requestId: string;
  config: AppConfig;
  actor: Actor | null;
  params: Record<string, string>;
  query: Record<string, string>;
  /** Raw parsed JSON body from the request; services validate/narrow it. */
  body: UnknownRecord;
  headers: Record<string, string | string[] | undefined>;
  route: RouteMeta;
  req: any; // Express Request (typed as any to avoid coupling types/index to express)
}

export type RouteHandler = (context: RouteContext) => HandlerResult | Promise<HandlerResult>;

// -------------------- database --------------------

export interface DatabaseStatus {
  configured: boolean;
  ok: boolean;
  type?: string;
  database?: string;
  user?: string;
  host?: string;
  port?: number;
  url?: string;
  latencyMs?: number;
  message?: string;
}

/**
 * A DB row after column->camelCase translation by the pg adapter. Rows come
 * from dynamic column mapping so individual fields are `any`; callers that
 * need guarantees should map rows into a typed domain shape.
 */
export type StoreRecord = Record<string, any>;
