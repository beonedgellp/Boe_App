// Legacy pgAdapter — now wraps Prisma Client.
// Services should import from '#db/prisma.js' directly for idiomatic usage.
// This file provides backward compatibility for the few remaining callers.

import { prisma } from './prisma.js';
export { prisma };
export { databaseStatus as jsonDatabaseStatus } from './client.js';
