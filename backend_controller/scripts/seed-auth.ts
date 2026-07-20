import { loadConfig } from '#config/env.js';
import { closePool, query } from '#db/client.js';
import { hashPassword } from '#security/passwords.js';

function enabled(value) {
  if (value == null || value === '') return true;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function userSeed(prefix, defaults) {
  return {
    email: (process.env[`${prefix}_EMAIL`] || defaults.email).toLowerCase(),
    password: process.env[`${prefix}_PASSWORD`] || defaults.password,
    usesDefaultPassword: !process.env[`${prefix}_PASSWORD`],
    firstName: process.env[`${prefix}_FIRST_NAME`] || defaults.firstName,
    lastName: process.env[`${prefix}_LAST_NAME`] || defaults.lastName,
    phone: process.env[`${prefix}_PHONE`] || defaults.phone,
    role: defaults.role,
    status: 'approved',
    riskProfileStatus: defaults.riskProfileStatus || 'approved',
    kycStatus: defaults.kycStatus || 'approved',
  };
}

function canSeed(config, seeds) {
  const sharedRuntime = config.nodeEnv === 'production' || config.providerMode === 'live';
  if (!sharedRuntime) return;

  const allowProductionSeed = enabled(process.env.SEED_AUTH_ALLOW_PRODUCTION);
  const usesDefaultPassword = seeds.some((seed) => seed.usesDefaultPassword);

  if (!allowProductionSeed) {
    throw new Error('Refusing to seed auth users in production/live mode without SEED_AUTH_ALLOW_PRODUCTION=true.');
  }
  if (usesDefaultPassword) {
    throw new Error('Refusing to seed default auth passwords in production/live mode.');
  }
}

async function upsertUser(config, seed) {
  const passwordHash = await hashPassword(seed.password);
  const overwrite = enabled(process.env.SEED_AUTH_OVERWRITE);

  if (!overwrite) {
    const existing = await query(config, 'SELECT id FROM users WHERE email = $1 LIMIT 1', [seed.email]);
    if (existing.rows.length > 0) {
      console.log(`skip existing ${seed.role} ${seed.email}`);
      return;
    }
  }

  await query(config, `
    INSERT INTO users (
      first_name, last_name, email, phone, password_hash, role, status,
      risk_profile_status, kyc_status, approved_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6::user_role, $7::user_status, $8::review_status, $9::review_status, now(), now())
    ON CONFLICT (email) DO UPDATE
    SET first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        phone = EXCLUDED.phone,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        status = EXCLUDED.status,
        risk_profile_status = EXCLUDED.risk_profile_status,
        kyc_status = EXCLUDED.kyc_status,
        approved_at = COALESCE(users.approved_at, now()),
        updated_at = now()
  `, [
    seed.firstName,
    seed.lastName,
    seed.email,
    seed.phone,
    passwordHash,
    seed.role,
    seed.status,
    seed.riskProfileStatus,
    seed.kycStatus,
  ]);
  console.log(`seeded ${seed.role} ${seed.email}`);
}

if (!enabled(process.env.SEED_AUTH_ENABLED)) {
  console.log('auth seed disabled');
  process.exit(0);
}

const config = loadConfig();
const seeds = [
  userSeed('SEED_ADMIN', {
    email: 'admin@beonedge.local',
    password: 'Admin@123456',
    firstName: 'BeOnEdge',
    lastName: 'Admin',
    phone: '+910000000001',
    role: 'admin',
  }),
  userSeed('SEED_CLIENT', {
    email: 'client@beonedge.local',
    password: 'Client@123456',
    firstName: 'BeOnEdge',
    lastName: 'Client',
    phone: '+910000000000',
    role: 'client',
  }),
];

try {
  canSeed(config, seeds);
  for (const seed of seeds) {
    await upsertUser(config, seed);
  }
} finally {
  await closePool();
}
