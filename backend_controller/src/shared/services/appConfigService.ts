import type { PublishConfigOptions, RequestContext } from '#types/services.js';
import type { AppConfig, Actor } from '#types/index.js';
import type { Prisma } from '@prisma/client';
import { HttpError } from '#http/errors.js';
import { hasDatabaseConfig, prisma } from '#db/client.js';

const CONFIG_KEY = 'mobile_app';
const MAX_CONFIG_BYTES = 1024 * 1024;

function requireDatabase(config: AppConfig): void {
  if (!hasDatabaseConfig(config)) {
    throw new HttpError(503, 'DATABASE_NOT_CONFIGURED', 'PostgreSQL is required for app configuration.');
  }
}

function plainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateAppConfig(config: unknown): Record<string, unknown> {
  if (!plainObject(config)) {
    throw new HttpError(400, 'INVALID_APP_CONFIG', 'App configuration must be a JSON object.');
  }

  const mobile = config.mobile;
  if (!plainObject(mobile)) {
    throw new HttpError(400, 'INVALID_APP_CONFIG', 'App configuration must include a mobile object.');
  }

  if (!Array.isArray(mobile.products)) {
    throw new HttpError(400, 'INVALID_APP_CONFIG', 'App configuration must include strategies.');
  }

  if (!plainObject(mobile.screens)) {
    throw new HttpError(400, 'INVALID_APP_CONFIG', 'App configuration must include mobile.screens.');
  }

  const encoded = JSON.stringify(config);
  if (encoded.length > MAX_CONFIG_BYTES) {
    throw new HttpError(413, 'APP_CONFIG_TOO_LARGE', 'App configuration is larger than the supported limit.');
  }

  return JSON.parse(encoded);
}

interface ConfigVersionRow {
  id: string;
  version: number;
  configJson: Prisma.JsonValue;
  publishedAt: Date;
  publishedBy: string | null;
}

interface ConfigPayload {
  id?: string;
  version?: number;
  config: Prisma.JsonValue | null;
  publishedAt?: Date | null;
  publishedBy?: string | null;
  source: string;
  published: boolean;
}

function rowToPayload(row: ConfigVersionRow | null): ConfigPayload {
  if (!row) {
    return {
      config: null,
      source: 'postgres',
      published: false,
    };
  }

  return {
    id: row.id,
    version: row.version,
    config: row.configJson,
    publishedAt: row.publishedAt,
    publishedBy: row.publishedBy,
    source: 'postgres',
    published: true,
  };
}

function normalizeUserAgent(value: string | string[] | null | undefined): string | null {
  if (Array.isArray(value)) return value.join(', ');
  return value || null;
}

export async function getPublishedConfigVersion(config: AppConfig, configKey: string) {
  requireDatabase(config);

  const row = await prisma.appConfigVersion.findFirst({
    where: { configKey, status: 'published' },
    orderBy: { version: 'desc' },
  });

  return rowToPayload(row);
}

export async function publishConfigVersion(
  config: AppConfig,
  configKey: string,
  actor: Actor,
  configJson: Record<string, unknown>,
  {
    reason,
    defaultReason,
    auditAction,
    entityType,
    requestContext = {},
  }: PublishConfigOptions = {},
) {
  requireDatabase(config);

  return prisma.$transaction(async (tx) => {
    const previousRow = await tx.appConfigVersion.findFirst({
      where: { configKey, status: 'published' },
      orderBy: { version: 'desc' },
      select: { id: true, version: true, configJson: true },
    });

    const nextVersion = (previousRow?.version || 0) + 1;

    const inserted = await tx.appConfigVersion.create({
      data: {
        configKey,
        version: nextVersion,
        configJson: configJson as Prisma.InputJsonValue,
        status: 'published',
        publishedBy: actor?.userId || null,
      },
    });

    await tx.adminAuditLog.create({
      data: {
        adminId: actor?.userId || null,
        action: auditAction || 'app_config.publish',
        entityType: entityType || 'app_config',
        entityId: inserted.id,
        ...(previousRow ? { beforeJson: previousRow.configJson as Prisma.InputJsonValue } : {}),
        afterJson: configJson as Prisma.InputJsonValue,
        reason: reason || defaultReason || null,
        ipAddress: requestContext.ipAddress || null,
        userAgent: normalizeUserAgent(requestContext.userAgent),
      },
    });

    return rowToPayload(inserted);
  });
}

export async function getPublishedAppConfig(config: AppConfig) {
  return getPublishedConfigVersion(config, CONFIG_KEY);
}

export async function publishAppConfig(
  config: AppConfig,
  actor: Actor,
  body: Record<string, unknown>,
  requestContext: RequestContext = {},
) {
  const incoming = validateAppConfig(body?.config ?? body);

  return publishConfigVersion(config, CONFIG_KEY, actor, incoming, {
    reason: typeof body?.reason === 'string' ? body.reason : undefined,
    defaultReason: 'Admin published app configuration.',
    auditAction: 'app_config.publish',
    entityType: 'app_config',
    requestContext,
  });
}

function configProducts(payload: ReturnType<typeof rowToPayload>): unknown[] {
  const config = payload.config;
  if (!plainObject(config)) return [];
  const mobile = config.mobile;
  if (!plainObject(mobile) || !Array.isArray(mobile.products)) return [];
  return mobile.products;
}

export async function listPublishedStrategiesFromAppConfig(config: AppConfig) {
  const payload = await getPublishedAppConfig(config);
  return {
    items: configProducts(payload),
    source: payload.published ? 'app_config_versions' : 'postgres_empty',
    publishedAt: payload.publishedAt || null,
    version: payload.version || null,
  };
}

export async function getPublishedStrategyFromAppConfig(config: AppConfig, productId: string) {
  const payload = await getPublishedAppConfig(config);
  const strategy = configProducts(payload).find(
    (item): item is Record<string, unknown> => plainObject(item) && item.id === productId,
  );

  if (!strategy) {
    throw new HttpError(404, 'STRATEGY_NOT_FOUND', `Strategy ${productId} is not published in app configuration.`);
  }

  return strategy;
}

export async function listResearchContextFromAppConfig(config: AppConfig) {
  const payload = await getPublishedAppConfig(config);
  const config_ = payload.config;
  const researchContext =
    plainObject(config_) && plainObject(config_.mobile) && Array.isArray(config_.mobile.researchContext)
      ? config_.mobile.researchContext
      : [];
  return {
    items: researchContext,
    source: payload.published ? 'app_config_versions' : 'postgres_empty',
    publishedAt: payload.publishedAt || null,
    version: payload.version || null,
  };
}
