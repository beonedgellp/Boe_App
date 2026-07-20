// Database client — now backed by Prisma.
//
// Exports `prisma` (the Prisma Client instance) for idiomatic Prisma usage,
// plus legacy `query()` / `transaction()` helpers for raw SQL where needed
// (e.g. health checks, ad-hoc admin queries). Services should prefer
// prisma.model.findMany/create/update/delete over raw SQL.

import { prisma } from './prisma.js';
import type { AppConfig } from '#types/index.js';

export { prisma };

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

export function hasDatabaseConfig(_config: AppConfig): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export async function databaseStatus(_config: AppConfig): Promise<DatabaseStatus> {
  if (!process.env.DATABASE_URL) {
    return { configured: false, ok: false, message: 'DATABASE_URL not set.' };
  }

  const startedAt = Date.now();
  try {
    const result: any[] = await prisma.$queryRaw`
      SELECT current_database() as database,
             current_user as "user",
             inet_server_addr()::text as host,
             inet_server_port() as port
    `;
    const row = result[0];
    return {
      configured: true,
      ok: true,
      type: 'prisma+pg',
      database: row?.database,
      user: row?.user,
      host: row?.host,
      port: row?.port,
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      configured: true,
      ok: false,
      type: 'prisma+pg',
      message: error instanceof Error ? error.message : String(error),
      latencyMs: Date.now() - startedAt,
    };
  }
}

export async function closePool(): Promise<void> {
  await prisma.$disconnect();
}
