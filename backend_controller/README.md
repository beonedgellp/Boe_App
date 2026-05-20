# BeOnEdge Backend Controller

This is the first backend slice for the BeOnEdge web onboarding, client app, and admin console. It provides a dependency-light HTTP API scaffold, role-aware route grouping, environment config, and a PostgreSQL migration runner.

## Quick Start

Start the backend server from this directory:

```bash
node scripts/start-dev.js
```

Start with the frontend dev server together:

```bash
node scripts/start-dev.js --with-frontend
```

The script handles graceful shutdown on `SIGINT` / `SIGTERM`.

## Commands

```bash
npm run start
npm run dev
npm run db:check
npm run routes
npm run migrate:status
npm run migrate
npm run seed:auth
```

`npm run migrate` uses the local `psql` CLI. It accepts either `DATABASE_URL` or discrete PostgreSQL env vars (`DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD`).

## Environment Variables

The backend loads `backend_controller/.env` automatically when present. Copy `.env.example` to `.env` and customize as needed.

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | `development` (default), `staging`, or `production` |
| `HOST` | Bind host (default: `127.0.0.1`) |
| `PORT` | Bind port (default: `47500`) |
| `LOG_LEVEL` | Logging level (default: `info`) |
| `DATABASE_URL` | Full PostgreSQL connection string |
| `DATABASE_HOST` / `DATABASE_PORT` / `DATABASE_NAME` / `DATABASE_USER` / `DATABASE_PASSWORD` | Discrete PostgreSQL vars (fallback if `DATABASE_URL` is absent) |
| `DATABASE_SSL` | Enable SSL for PostgreSQL (default: `false`) |
| `DATA_STORE` | `json` or `postgres` (default: `postgres`) |
| `JSON_DB_PATH` | Path to local JSON dev DB (default: `./data/dev-db.json`) |
| `DB_POOL_MAX` | Max DB pool size (default: `10`) |
| `DB_CONNECTION_TIMEOUT_MS` | DB connection timeout (default: `3000`) |
| `DB_IDLE_TIMEOUT_MS` | DB idle timeout (default: `10000`) |
| `MIGRATIONS_DIR` | Migrations directory (default: `./db/migrations`) |
| `PROVIDER_MODE` | `development`, `staging`, or `live` (default: `development`) |
| `CORS_ORIGIN` | Comma-separated allowed origins |
| `ACCESS_TOKEN_SECRET` | JWT access token secret (min 32 chars, no default placeholders in prod) |
| `REFRESH_TOKEN_SECRET` | JWT refresh token secret (min 32 chars, no default placeholders in prod) |
| `ALLOW_DEV_AUTH` | Enable dev-only auth shortcuts (default: `false`) |
| `ADMIN_LOGIN_ID` / `ADMIN_PASSWORD` / `ADMIN_FIRST_NAME` / `ADMIN_LAST_NAME` / `ADMIN_PHONE` | Direct admin login credentials |
| `MOCK_WEBHOOK_ENABLED` | Enable mock webhook endpoints for local testing (default: `false`) |

## Local Data Store

For local development, `DATA_STORE=json` persists client auth sessions and app configuration in `backend_controller/data/dev-db.json`. Keep `DATABASE_URL` in place so the project can switch back to PostgreSQL later by setting `DATA_STORE=postgres`.

Use `npm run db:check` to verify the configured active data store without running migrations.

## Seed Data

Populate the local JSON store with smoke-test entities (users, funds, plans, transactions, tickets, webhooks, etc.):

```bash
node scripts/seed-smoke-data.js
```

## Smoke Test

Run a lightweight client-auth smoke test against the running backend:

```bash
node scripts/smoke-client-auth.js
```

## Android Emulator Access

The Android emulator cannot reach the host backend through its own `127.0.0.1` unless ADB reverse port mapping is active. For the debug APK, the frontend expects:

```text
VITE_BEO_API_BASE_URL=http://127.0.0.1:47502
```

When testing the app in the emulator, keep the backend running on the host and establish the reverse mapping:

```bash
adb reverse tcp:47502 tcp:47502
```

The project helper does this automatically before reinstalling and launching the APK:

```bash
../emu/boe_update.sh
```

## Docker

From the repository root, Docker Compose owns PostgreSQL, runs migrations, seeds local auth users, and then starts the backend:

```bash
docker compose up --build
```

Default service ports:

- Frontend: `http://localhost:8080`
- Backend: `http://localhost:47502`
- PostgreSQL: `127.0.0.1:5433` mapped to the container's `5432`

The backend, migration, and seed containers connect to PostgreSQL over the Docker network using `DATABASE_HOST=postgresql`. The host PostgreSQL port is bound to `127.0.0.1` for local debugging; keep it internal-only in production by removing the port mapping in a deployment override.

Local Docker seed users:

- Admin: `admin@beonedge.local` / `Admin@123456`
- Client: `client@beonedge.local` / `Client@123456`

Override the `SEED_*` values and token secrets in a real environment. `ALLOW_DEV_AUTH` should remain `false` outside isolated local scaffolding.
The seed job does not overwrite existing users unless `SEED_AUTH_OVERWRITE=true`; it also refuses production/live seeding unless `SEED_AUTH_ALLOW_PRODUCTION=true` and custom seed passwords are supplied.

## API Shape

- `GET /health`
- `GET /v1/health`
- `GET /v1/system/reachability`
- `POST /v1/auth/login`
- `POST /v1/auth/logout`
- `POST /v1/auth/refresh`
- `GET /v1/auth/session`
- Public, client, admin, webhook, and internal route groups are registered under `/v1`.

Most business routes intentionally return `501` until PostgreSQL-backed service modules are implemented. The route metadata and authorization boundaries are in place so frontend adapters can move to HTTP without changing screen return shapes.
