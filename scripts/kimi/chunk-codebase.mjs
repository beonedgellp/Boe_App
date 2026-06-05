#!/usr/bin/env node
// Chunk the BOE codebase into domain-grouped .txt files for Kimi Web upload.
//
// Kimi Web has no project file-system: you upload text and it answers in chat.
// This script flattens each product surface into one .txt file (with per-file
// `===== FILE: <relpath> =====` headers) so a Kimi agent swarm can reason about
// a whole domain inside one context window, then emit changes in the same header
// format that `apply-kimi-output.mjs` writes back to disk.
//
// Current rebuild target:
//   - Recreate BeOnEdge from scratch with Kimi agents.
//   - PostgreSQL is the runtime database. Do not rebuild on the JSON file store.
//   - Docker / Docker Compose is the expected local and deployable runtime.
//   - Include Groww-style mobile references, Optimus landing references, and
//     resources/sessions product specs as first-class context chunks.
//
// Usage:
//   node scripts/kimi/chunk-codebase.mjs [repoRoot]
//
// Output: <repoRoot>/kimi_chunks/<domain>.txt + manifest.json

import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const REPO_ROOT = path.resolve(process.argv[2] ?? process.cwd());
const OUTPUT_DIR = path.join(REPO_ROOT, 'kimi_chunks');

// Tunables — keep them named, never inline magic numbers.
const MAX_FILE_BYTES = 512 * 1024; // skip oversized data dumps / generated blobs
const CHARS_PER_TOKEN = 4; // rough English token estimate
const KIMI_CONTEXT_TOKENS = 256_000; // K2.x context budget, for the size warning

const INCLUDE_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
  '.css', '.scss', '.html', '.json', '.md',
  '.sql', '.yaml', '.yml', '.svg', '.py', '.sh',
]);

const EXCLUDED_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'android',
  '.next', 'coverage', '.vite', '.turbo', '.cache',
  'kimi_chunks', '.kimi_backups', 'credentials',
]);

const EXCLUDED_FILES = new Set([
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
  '.env', 'kimi-api-key.txt',
]);

const ALWAYS_INCLUDE_FILES = new Set([
  'Dockerfile',
  '.dockerignore',
  'nginx.conf',
]);

const GLOBAL_REBUILD_CONTRACT = `
## Global Kimi Rebuild Contract

- Use these chunks to recreate the project from scratch with a Kimi agents swarm.
- Target runtime database is PostgreSQL. Do not use JSON files as the application database. Existing JSON-store code is historical context and migration pressure only.
- Containerization is required: a fresh implementation should include Dockerfiles plus Docker Compose services for postgres, backend, and frontend.
- Preserve the product surfaces: backend_controller API, frontend_stack client/admin/website/app shell, Groww-inspired mobile investing UX, Optimus-inspired public landing polish, and resources/sessions behavior specs.
- Keep secrets out of code and generated output. Use environment variables and placeholder values only.
- Return changed/new files in the framed file-block format documented below.
`.trim();

const PROJECT_REBUILD_BRIEF = `
# BeOnEdge Fresh Rebuild Brief For Kimi Agents

## Product Shape

BeOnEdge is an Indian investing platform with three user-facing surfaces and one backend controller:

- Client investing app: Vite + React 18 package consumed by the app shell, with web and Capacitor Android targets. Covers onboarding handoff, dashboard, explore/fund detail, SIP/lumpsum, payment status, mandates, portfolio, withdrawals, transactions, statements, notifications, KYC, security, support, legal pages, and locked/approval states.
- Admin portal: Vite + React 18 package for operations. Covers overview, approvals, AUM/funds, payments, mandates, KYC review, risk profiles, SIP controls, audit logs, support tickets, ledger, holdings, transactions, user details, environment, app builder, and admin auth.
- Public website: marketing/education/onboarding surface under the same Vite app shell. Includes landing, APK/download, financial literacy, disclosures, and account-opening/risk/KYC flows.
- Backend controller: Node.js 22 ES modules with a custom HTTP router, shared response envelope, validation helpers, JWT/device-session auth, Razorpay payments/webhooks, admin audit, app config, fund catalog, statements/receipts/timeline, and client/admin/website route modules.

## Non-Negotiable Rebuild Decisions

- PostgreSQL is the source of truth. Runtime DB config should use DB_DRIVER=pg and DATABASE_URL or discrete DATABASE_* variables.
- Do not ship DATA_STORE=json or JSON_DB_PATH as the main app mode. JSON fixtures may be kept only for tests or one-time migration/import tooling.
- Implement repository/service boundaries around Postgres using parameterized queries and explicit transactions. The current code has many direct imports from #db/jsonStore.js and "postgres_pending" branches; these identify the areas that must become real Postgres-backed services.
- Keep the existing SQL migrations as schema context, but revise/extend them if the fresh implementation needs stronger relational constraints, indexes, enum coverage, seed data, or JSONB payload compatibility.
- Dockerize the stack. Expected local compose services: postgres, backend, frontend. Backend should wait for Postgres, run migrations, seed safe local data when enabled, then start.
- Keep Indian finance conventions: INR formatting, market-risk disclosures on investment screens, no casual renaming of BeOnEdge, and signal colors only for money/risk states.

## Suggested Kimi Swarm Upload Order

1. project_rebuild_brief.txt
2. sessions_specs.txt
3. backend_core.txt
4. deployment_runtime.txt
5. frontend_app_shell.txt
6. frontend_shared.txt
7. frontend_client.txt
8. frontend_admin.txt
9. frontend_website.txt
10. reference_grow.txt
11. reference_optimus.txt
12. kimi_orchestration.txt
13. testing_context.txt, when an agent is writing verification.

## Agent Split

- Backend/Postgres agent: schema, migrations, repository layer, auth/session persistence, payments/webhooks, idempotency, admin audit, seed scripts, health checks.
- Client app agent: mobile-first investing UX, Capacitor-safe platform abstractions, session flows, fund detail, payment/mandate/portfolio flows.
- Admin agent: operational workflows, approvals, AUM/funds, payment reconciliation, KYC/risk/support/audit UI.
- Website agent: public landing, financial literacy, onboarding/risk/KYC/disclosure flows.
- Design/reference agent: translate Groww mobile patterns and Optimus landing patterns into BeOnEdge tokens/components without copying brand identity.
- QA agent: route inventory, unit/integration/E2E smoke tests, Docker compose health, frontend build, backend DB checks.
`.trim();

const DOCKER_POSTGRES_CONTRACT = `
# Docker And PostgreSQL Runtime Contract

## Required Services

- postgres: use a supported postgres image such as postgres:16-alpine, persistent named volume, explicit POSTGRES_USER/POSTGRES_PASSWORD/POSTGRES_DB placeholders, and a pg_isready healthcheck.
- backend: build from backend_controller/Dockerfile, run on Node 22+, expose 47502, set HOST=0.0.0.0, DB_DRIVER=pg, DATABASE_URL=postgres://\${POSTGRES_USER}:\${POSTGRES_PASSWORD}@postgres:5432/\${POSTGRES_DB}, and depend on postgres health.
- frontend: build from frontend_stack/app/Dockerfile, serve Vite output through nginx, expose a configurable public port, and build with VITE_BEO_API_BASE_URL pointing at the backend for the chosen environment.

## Backend Startup

- Apply backend_controller/db/migrations before serving traffic.
- Seed local/dev auth and catalog data only when an explicit SEED_* flag is enabled.
- Healthcheck must fail when Postgres is unreachable.
- Do not require or mount a JSON database file for normal operation.

## Environment

Use placeholder-only examples:

- POSTGRES_USER=<db-user>
- POSTGRES_PASSWORD=<db-password>
- POSTGRES_DB=boe_app
- DATABASE_URL=postgres://<db-user>:<db-password>@postgres:5432/boe_app
- DB_DRIVER=pg
- ACCESS_TOKEN_SECRET=<64-char-random-secret>
- REFRESH_TOKEN_SECRET=<64-char-random-secret>
- CORS_ORIGIN=http://localhost:<frontend-port>
- PROVIDER_MODE=development|staging|live
- RAZORPAY_KEY_ID=<provider-key-id>
- RAZORPAY_KEY_SECRET=<provider-secret>
- RAZORPAY_WEBHOOK_SECRET=<webhook-secret>

Never include real API keys, local private passwords, or resources/credentials files in Kimi prompts or generated output.
`.trim();

const GROW_REFERENCE_NOTES = `
# Groww Mobile Reference Notes

The source images live in resources/reference/Grow reference/ and are binary screenshots, so this text chunk describes the usable visual/product patterns for Kimi.

## Screenshot_2026-05-21-16-48-53-360_com.nextbillion.groww.jpg.jpeg

- Path: resources/reference/Grow reference/Screenshot_2026-05-21-16-48-53-360_com.nextbillion.groww.jpg.jpeg
- Size: 1074 x 6161.
- Tall dark-mode mutual-fund detail screen.
- Top area: status bar, back arrow, small fund logo, icon buttons for cart, bookmark, and search.
- Fund identity: bold fund name, muted metadata row for risk/category/type, large green annualized return with smaller daily delta.
- Main chart: full-width line chart on black background with timeframe chips 1M, 6M, 1Y, 3Y selected, 5Y, ALL.
- Fact grid: NAV/date, rating, minimum SIP amount, and fund size in compact two-column layout.
- Return calculator section: collapsible header, rounded card, segmented Monthly SIP / One-time toggle, large amount, slider, bar chart by horizon, selected horizon chip, legend rows for total investment and projected value, and green return percentage.
- Holdings section: list of top holdings with company names, chevrons, right-aligned percentages, and footer links for all holdings and holdings analysis.

## Screenshot_2026-05-21-16-50-31-051_com.nextbillion.groww.jpg.jpeg

- Path: resources/reference/Grow reference/Screenshot_2026-05-21-16-50-31-051_com.nextbillion.groww.jpg.jpeg
- Size: 1080 x 3830.
- Holdings analysis detail screen in dark mode.
- App bar: back arrow, title, and fund subtitle.
- Large donut chart for Equity / Debt / Cash split with total AUM in the center and a compact legend grid below.
- Large multi-color donut chart for sector allocation with center AUM and two-column legend entries.
- Advanced ratios section: compact grid for P/E, P/B, Beta, Alpha, Sharpe, Sortino.
- Footnote date for holdings data.

## Translation To BeOnEdge

- Use the pattern language, not Groww branding.
- Keep BeOnEdge tokens, fonts, logo, disclosures, and data contracts.
- Prefer dense mobile-first information architecture for fund detail and holdings analysis.
- Use positive green only for returns/action states; keep other chart colors purposeful and accessible.
- Ensure the same data can render in desktop layouts without losing the mobile-first hierarchy.
`.trim();

const SESSIONS_COMPATIBILITY_NOTE = `
Some older session files mention DATA_STORE=json because that was the historical dev setup. For the fresh rebuild, treat those mentions as stale environment notes. Product behavior remains valid, but persistence must be PostgreSQL and containerized.
`.trim();

const HISTORICAL_AGENT_DOCS_NOTE = `
Some orchestration docs are historical phase logs from the existing repo and may describe a dual JSON/Postgres adapter or JSON development mode. The fresh Kimi rebuild target supersedes that: PostgreSQL is the only runtime persistence mode, Docker Compose is the baseline runtime, and JSON files are limited to tests/import fixtures.
`.trim();

const TESTING_CONTEXT_NOTE = `
Testing files describe critical flows and past evidence. When tests mention JSON stores or local provider key IDs, port the behavior to Postgres/Docker and use placeholder provider credentials.
`.trim();

// Each domain is one upload file. Roots that do not exist are skipped silently,
// so the same config survives package renames / legacy removal.
const DOMAINS = [
  {
    name: 'project_rebuild_brief',
    summary: 'Upload first: fresh-build instructions, project shape, Postgres/Docker target, and Kimi swarm split.',
    virtualFiles: [
      { path: 'kimi_context/project-rebuild-brief.md', content: PROJECT_REBUILD_BRIEF },
    ],
  },
  {
    name: 'backend_core',
    summary: 'Node.js HTTP API: routes, services, db adapters, config, security, migrations, scripts. Rebuild target is PostgreSQL, not JSON.',
    notes: [
      'Current backend code still contains JSON-store imports and postgres_pending branches. Use these as a migration map: a fresh rebuild should implement real Postgres-backed repositories/services instead of preserving JSON runtime behavior.',
    ],
    roots: [
      'backend_controller/package.json',
      'backend_controller/src',
      'backend_controller/db/migrations',
      'backend_controller/scripts',
    ],
  },
  {
    name: 'deployment_runtime',
    summary: 'Docker/Postgres runtime files and sanitized environment contract for the fresh rebuild.',
    virtualFiles: [
      { path: 'kimi_context/docker-postgres-runtime-contract.md', content: DOCKER_POSTGRES_CONTRACT },
    ],
    roots: [
      'package.json',
      'backend_controller/package.json',
      'backend_controller/Dockerfile',
      'backend_controller/.dockerignore',
      'frontend_stack/package.json',
      'frontend_stack/app/package.json',
      'frontend_stack/app/Dockerfile',
      'frontend_stack/app/.dockerignore',
      'frontend_stack/app/nginx.conf',
      'frontend_stack/app/vite.config.js',
      'frontend_stack/app/capacitor.config.json',
    ],
  },
  {
    name: 'frontend_app_shell',
    summary: 'Vite app shell that wires client/admin/website packages, routing, Capacitor config, and browser/native roots.',
    roots: [
      'frontend_stack/package.json',
      'frontend_stack/app/package.json',
      'frontend_stack/app/src',
      'frontend_stack/app/index.html',
      'frontend_stack/app/vite.config.js',
      'frontend_stack/app/capacitor.config.json',
    ],
  },
  {
    name: 'frontend_client',
    summary: 'Client investing app — Vite + React 18 (Capacitor/Android): pages, services, styles.',
    roots: [
      'frontend_stack/packages/client',
      'frontend_stack/packages/client-platform-web',
      'frontend_stack/packages/client-platform-native',
    ],
  },
  {
    name: 'frontend_admin',
    summary: 'Admin portal — Vite + React 18 (future app port): screens, AUM controls, fund/admin UI.',
    roots: ['frontend_stack/packages/admin'],
  },
  {
    name: 'frontend_website',
    summary: 'Public website package — Vite + React website/onboarding/education surface. Optimus is a separate Next.js reference chunk.',
    roots: [
      'frontend_stack/packages/landing_page',
      'frontend_stack/packages/website',
      'frontend_stack/packages/landing-page',
    ],
  },
  {
    name: 'frontend_shared',
    summary: 'Shared components, design tokens, UI kits — Vite + React.',
    roots: [
      'frontend_stack/colors_and_type.css',
      'frontend_stack/assets',
      'frontend_stack/packages/shared',
      'frontend_stack/packages/ui-kits',
      'frontend_stack/packages/design-tokens',
    ],
  },
  {
    name: 'reference_grow',
    summary: 'Groww mobile mutual-fund screenshots translated into BeOnEdge implementation notes.',
    roots: ['resources/reference/Grow reference'],
    virtualFiles: [
      { path: 'kimi_context/grow-reference-notes.md', content: GROW_REFERENCE_NOTES },
    ],
  },
  {
    name: 'reference_optimus',
    summary: 'Next.js design/build reference for the public landing page (code only).',
    roots: ['resources/reference/optimus-the-ai-platform-to-build-and-ship'],
  },
  {
    name: 'sessions_specs',
    summary: 'Product specs / session plans that define WHAT to build (markdown); old JSON-store env notes are historical only.',
    notes: [SESSIONS_COMPATIBILITY_NOTE],
    roots: ['resources/sessions'],
  },
  {
    name: 'kimi_orchestration',
    summary: 'Existing Kimi/agent orchestration docs and scripts for swarm execution.',
    notes: [HISTORICAL_AGENT_DOCS_NOTE],
    roots: [
      'scripts/kimi',
      'resources/agent',
    ],
  },
  {
    name: 'testing_context',
    summary: 'Smoke/E2E/regression scripts that describe critical verification flows.',
    notes: [TESTING_CONTEXT_NOTE],
    roots: ['resources/testing'],
  },
];

function sanitizeContent(content) {
  return content
    .replace(/rzp_(test|live)_[A-Za-z0-9]{8,}/g, 'rzp_$1_<redacted_key_id>')
    .replace(/(RAZORPAY_KEY_SECRET\s*=\s*)[^\s'"]+/gi, '$1<provider-secret>')
    .replace(/(RAZORPAY_WEBHOOK_SECRET\s*=\s*)[^\s'"]+/gi, '$1<webhook-secret>')
    .replace(/(ACCESS_TOKEN_SECRET\s*=\s*)[^\s'"]+/gi, '$1<access-token-secret>')
    .replace(/(REFRESH_TOKEN_SECRET\s*=\s*)[^\s'"]+/gi, '$1<refresh-token-secret>');
}

function shouldIncludeFile(absPath, sizeBytes) {
  const base = path.basename(absPath);
  if (EXCLUDED_FILES.has(base)) return false;
  if (sizeBytes > MAX_FILE_BYTES) return false;
  return ALWAYS_INCLUDE_FILES.has(base) || INCLUDE_EXTENSIONS.has(path.extname(absPath).toLowerCase());
}

// Manual recursion so excluded directories are pruned before descending.
async function collectFiles(absPath, acc) {
  const stat = await fs.stat(absPath).catch(() => null);
  if (!stat) return acc;

  if (stat.isFile()) {
    if (shouldIncludeFile(absPath, stat.size)) acc.push(absPath);
    return acc;
  }
  if (!stat.isDirectory()) return acc;
  if (EXCLUDED_DIRS.has(path.basename(absPath))) return acc;

  const entries = await fs.readdir(absPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && EXCLUDED_DIRS.has(entry.name)) continue;
    await collectFiles(path.join(absPath, entry.name), acc);
  }
  return acc;
}

function estimateTokens(text) {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

async function buildDomainChunk(domain) {
  const collected = [];
  for (const root of domain.roots || []) {
    await collectFiles(path.join(REPO_ROOT, root), collected);
  }

  const seen = new Set();
  const files = collected
    .filter((abs) => (seen.has(abs) ? false : seen.add(abs)))
    .sort();

  const parts = [
    `# DOMAIN: ${domain.name} — ${domain.summary}`,
    '',
    GLOBAL_REBUILD_CONTRACT,
    '',
  ];

  if (domain.notes?.length) {
    parts.push('## Domain Notes', '', ...domain.notes, '');
  }

  parts.push(
    '# Return changed/new files as full files in this exact frame (repo-root-relative paths):',
    '#   ===== FILE: path/from/repo/root.ext =====  <content>  ===== END FILE =====',
    '',
  );

  for (const virtualFile of domain.virtualFiles || []) {
    parts.push(`===== FILE: ${virtualFile.path} =====`, virtualFile.content.trimEnd(), '===== END FILE =====', '');
  }

  for (const abs of files) {
    const rel = path.relative(REPO_ROOT, abs).split(path.sep).join('/');
    const content = sanitizeContent(await fs.readFile(abs, 'utf8'));
    parts.push(`===== FILE: ${rel} =====`, content, '===== END FILE =====', '');
  }

  const text = parts.join('\n');
  return {
    name: domain.name,
    summary: domain.summary,
    roots: domain.roots || [],
    physicalFileCount: files.length,
    virtualFileCount: domain.virtualFiles?.length || 0,
    fileCount: files.length + (domain.virtualFiles?.length || 0),
    text,
    tokens: estimateTokens(text),
  };
}

async function main() {
  await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const chunks = [];
  for (const domain of DOMAINS) {
    const chunk = await buildDomainChunk(domain);
    if (chunk.fileCount === 0) {
      console.warn(`skip ${chunk.name}: no matching files`);
      continue;
    }
    await fs.writeFile(path.join(OUTPUT_DIR, `${chunk.name}.txt`), chunk.text, 'utf8');
    const warn = chunk.tokens > KIMI_CONTEXT_TOKENS ? '  ⚠ exceeds single-context budget' : '';
    console.log(`wrote ${chunk.name}.txt — ${chunk.fileCount} files, ~${chunk.tokens.toLocaleString()} tokens${warn}`);
    chunks.push(chunk);
  }

  await fs.writeFile(
    path.join(OUTPUT_DIR, 'manifest.json'),
    JSON.stringify(
      { generatedAt: new Date().toISOString(), repoRoot: REPO_ROOT, chunks: chunks.map(({ text, ...rest }) => rest) },
      null,
      2,
    ),
    'utf8',
  );

  const totalTokens = chunks.reduce((sum, c) => sum + c.tokens, 0);
  console.log(`\n${chunks.length} chunks → ${OUTPUT_DIR}`);
  console.log(`total ~${totalTokens.toLocaleString()} tokens. Upload the *.txt files to Kimi Web.`);
}

main().catch((err) => {
  console.error(`chunk-codebase failed: ${err.message}`);
  process.exit(1);
});
