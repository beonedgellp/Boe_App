import { randomUUID } from 'node:crypto';
import { HttpError } from '#http/errors.js';
import { hasDatabaseConfig, query, transaction } from '#db/client.js';

const CONFIG_KEY = 'mobile_app';
const MAX_CONFIG_BYTES = 1024 * 1024;

function requireDatabase(config) {
  if (!hasDatabaseConfig(config)) {
    throw new HttpError(503, 'DATABASE_NOT_CONFIGURED', 'PostgreSQL is required for app configuration.');
  }
}

function plainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateAppConfig(config) {
  if (!plainObject(config)) {
    throw new HttpError(400, 'INVALID_APP_CONFIG', 'App configuration must be a JSON object.');
  }

  if (!plainObject(config.mobile)) {
    throw new HttpError(400, 'INVALID_APP_CONFIG', 'App configuration must include a mobile object.');
  }

  if (!Array.isArray(config.mobile.products)) {
    throw new HttpError(400, 'INVALID_APP_CONFIG', 'App configuration must include strategies.');
  }

  if (!plainObject(config.mobile.screens)) {
    throw new HttpError(400, 'INVALID_APP_CONFIG', 'App configuration must include mobile.screens.');
  }

  const encoded = JSON.stringify(config);
  if (encoded.length > MAX_CONFIG_BYTES) {
    throw new HttpError(413, 'APP_CONFIG_TOO_LARGE', 'App configuration is larger than the supported limit.');
  }

  return JSON.parse(encoded);
}

function rowToPayload(row) {
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
    config: row.config_json,
    publishedAt: row.published_at,
    publishedBy: row.published_by,
    source: 'postgres',
    published: true,
  };
}

export async function getPublishedConfigVersion(config, configKey) {
  requireDatabase(config);

  const result = await query(config, `
    SELECT id, version, config_json, published_at, published_by
    FROM app_config_versions
    WHERE config_key = $1 AND status = 'published'
    ORDER BY version DESC
    LIMIT 1
  `, [configKey]);

  return rowToPayload(result.rows[0]);
}

export async function publishConfigVersion(config, configKey, actor, configJson, {
  reason,
  defaultReason,
  auditAction,
  entityType,
  requestContext = {},
}: any = {}) {
  requireDatabase(config);

  return transaction(config, async (client) => {
    const previous = await client.query(`
      SELECT id, version, config_json
      FROM app_config_versions
      WHERE config_key = $1 AND status = 'published'
      ORDER BY version DESC
      LIMIT 1
    `, [configKey]);

    const previousRow = previous.rows[0] || null;
    const nextVersion = (previousRow?.version || 0) + 1;

    const inserted = await client.query(`
      INSERT INTO app_config_versions (
        config_key,
        version,
        config_json,
        status,
        published_by
      )
      VALUES ($1, $2, $3::jsonb, 'published', $4)
      RETURNING id, version, config_json, published_at, published_by
    `, [configKey, nextVersion, JSON.stringify(configJson), actor?.id || null]);

    await client.query(`
      INSERT INTO admin_audit_logs (
        admin_id,
        action,
        entity_type,
        entity_id,
        before_json,
        after_json,
        reason,
        ip_address,
        user_agent
      )
      VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9)
    `, [
      actor?.id || null,
      auditAction,
      entityType,
      inserted.rows[0].id,
      previousRow ? JSON.stringify(previousRow.config_json) : null,
      JSON.stringify(configJson),
      reason || defaultReason,
      requestContext.ipAddress || null,
      requestContext.userAgent || null,
    ]);

    return rowToPayload(inserted.rows[0]);
  });
}

export async function getPublishedAppConfig(config): Promise<any> {
  return getPublishedConfigVersion(config, CONFIG_KEY);
}

export async function publishAppConfig(config, actor, body, requestContext: any = {}) {
  const incoming = validateAppConfig(body?.config ?? body);

  return publishConfigVersion(config, CONFIG_KEY, actor, incoming, {
    reason: body?.reason,
    defaultReason: 'Admin published app configuration.',
    auditAction: 'app_config.publish',
    entityType: 'app_config',
    requestContext,
  });
}

export async function listPublishedStrategiesFromAppConfig(config) {
  const payload = await getPublishedAppConfig(config);
  return {
    items: payload.config?.mobile?.products || [],
    source: payload.published ? 'app_config_versions' : 'postgres_empty',
    publishedAt: payload.publishedAt || null,
    version: payload.version || null,
  };
}

export async function getPublishedStrategyFromAppConfig(config, productId) {
  const payload = await getPublishedAppConfig(config);
  const strategy = payload.config?.mobile?.products?.find((item) => item.id === productId);

  if (!strategy) {
    throw new HttpError(404, 'STRATEGY_NOT_FOUND', `Strategy ${productId} is not published in app configuration.`);
  }

  return strategy;
}

export async function listResearchContextFromAppConfig(config) {
  const payload = await getPublishedAppConfig(config);
  return {
    items: payload.config?.mobile?.researchContext || [],
    source: payload.published ? 'app_config_versions' : 'postgres_empty',
    publishedAt: payload.publishedAt || null,
    version: payload.version || null,
  };
}
