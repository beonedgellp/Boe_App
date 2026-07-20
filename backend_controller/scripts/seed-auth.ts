import type { AppConfig } from '#types/index.js';
import type { UserRole, UserStatus, ReviewStatus } from '@prisma/client';
import { loadConfig } from '#config/env.js';
import { closePool, prisma } from '#db/client.js';
import { hashPassword } from '#security/passwords.js';

interface SeedDefaults {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: UserRole;
  riskProfileStatus?: ReviewStatus;
  kycStatus?: ReviewStatus;
}

interface UserSeed {
  email: string;
  password: string;
  usesDefaultPassword: boolean;
  firstName: string;
  lastName: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  riskProfileStatus: ReviewStatus;
  kycStatus: ReviewStatus;
}

function enabled(value: string | undefined): boolean {
  if (value == null || value === '') return true;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function userSeed(prefix: string, defaults: SeedDefaults): UserSeed {
  return {
    email: (process.env[`${prefix}_EMAIL`] || defaults.email).toLowerCase(),
    password: process.env[`${prefix}_PASSWORD`] || defaults.password,
    usesDefaultPassword: !process.env[`${prefix}_PASSWORD`],
    firstName: process.env[`${prefix}_FIRST_NAME`] || defaults.firstName,
    lastName: process.env[`${prefix}_LAST_NAME`] || defaults.lastName,
    phone: process.env[`${prefix}_PHONE`] || defaults.phone,
    role: defaults.role,
    status: 'approved' as UserStatus,
    riskProfileStatus: defaults.riskProfileStatus || ('approved' as ReviewStatus),
    kycStatus: defaults.kycStatus || ('approved' as ReviewStatus),
  };
}

function canSeed(config: AppConfig, seeds: UserSeed[]): void {
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

async function upsertUser(seed: UserSeed): Promise<void> {
  const passwordHash = await hashPassword(seed.password);
  const overwrite = enabled(process.env.SEED_AUTH_OVERWRITE);

  const existing = await prisma.user.findUnique({
    where: { email: seed.email },
    select: { id: true, approvedAt: true },
  });

  if (existing && !overwrite) {
    console.log(`skip existing ${seed.role} ${seed.email}`);
    return;
  }

  const shared = {
    firstName: seed.firstName,
    lastName: seed.lastName,
    phone: seed.phone,
    passwordHash,
    role: seed.role,
    status: seed.status,
    riskProfileStatus: seed.riskProfileStatus,
    kycStatus: seed.kycStatus,
  };

  if (existing) {
    await prisma.user.update({
      where: { email: seed.email },
      data: {
        ...shared,
        approvedAt: existing.approvedAt ?? new Date(),
      },
    });
  } else {
    await prisma.user.create({
      data: {
        ...shared,
        email: seed.email,
        approvedAt: new Date(),
      },
    });
  }
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
    role: 'admin' as UserRole,
  }),
  userSeed('SEED_CLIENT', {
    email: 'client@beonedge.local',
    password: 'Client@123456',
    firstName: 'BeOnEdge',
    lastName: 'Client',
    phone: '+910000000000',
    role: 'client' as UserRole,
  }),
];

try {
  canSeed(config, seeds);
  for (const seed of seeds) {
    await upsertUser(seed);
  }
} finally {
  await closePool();
}
