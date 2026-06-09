# BeOnEdge — VPS deployment

The VPS runs **only** three containers — public **landing** (Next.js), **backend_controller**
API, and **PostgreSQL** — orchestrated from `release_manager/BOE_APP/`. The admin web
portal and client APK are **not** deployed here; they run locally (`npm run dev` / app
build) and connect to this same backend over the public domain.

**One env file drives everything:** `release_manager/BOE_APP/.env`. Its defaults target
localhost; going live means swapping the localhost URLs in its **PUBLIC SURFACE** block
for your domain. Internal container wiring uses Docker service names, so nothing else moves.

```
                 Internet :443
                       │
              ┌────────▼─────────┐   host nginx (TLS, NOT a container)
              │   host nginx     │   frontend_stack/deploy/nginx.single-port.example.conf
              └───┬──────────┬───┘
            /     │          │  /v1/
        ┌─────────▼──┐   ┌───▼────────┐
        │ landing    │   │ backend    │◄── admin (local) + client APK connect here
        │ :3100      │   │ :47502     │
        └────────────┘   └─────┬──────┘
                               │
                         ┌─────▼──────┐
                         │ postgres   │  (pgdata volume; internal network)
                         └────────────┘
```

Both app containers bind to `127.0.0.1` only; the host nginx is the sole public entry.

## Release flow (image-based, via release_manager)

```bash
# 1. Build machine — build + bundle the images
./release_manager/export.sh --version 1.0.0     # or --patch / --minor / --major

# 2. Ship release_manager/ to the VPS (rsync/scp/git), then on the VPS:
cd release_manager/BOE_APP
cp .env.example .env            # first time only
#   Edit .env:
#     - PUBLIC SURFACE block: swap localhost URLs -> https://<your-domain>
#       PUBLIC_LANDING_ORIGIN=https://<your-domain>
#       PUBLIC_API_BASE_URL=https://<your-domain>
#       CORS_ORIGIN=https://<your-domain>,http://localhost:5173,...,capacitor://localhost
#     - Fill every CHANGE_ME secret (production hard-fails on placeholders):
#         openssl rand -hex 48   # ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET
#         openssl rand -hex 32   # SIGNUP_PROXY_SECRET
#         strong values for POSTGRES_PASSWORD, ADMIN_PASSWORD, SEED_CLIENT_PASSWORD

# 3. Deploy (postgres -> migrate -> seed -> backend -> landing, with health checks)
cd ../..
./release_manager/deploy.sh

# Roll back if needed
./release_manager/rollback.sh
```

`deploy.sh` reuses an existing `BOE_APP/.env`; the bundle's `.env` is only a first-deploy
fallback. During VPS shipping, the script archives the active `BOE_APP/` directory and
replaces the remote `BOE_APP/` after `docker compose down`. The VPS `.env` is restored
into the new directory with only `BOE_VERSION` advanced, so compose uses the newly
loaded image tags while keeping the VPS secrets/domains intact. Postgres data persists
in the `pgdata` volume across deploys and rollbacks.

## Host nginx + TLS (one-time, on the VPS)

```bash
sudo cp frontend_stack/deploy/nginx.single-port.example.conf /etc/nginx/sites-available/beonedge.conf
sudo sed -i 's/your-domain.tld/<your-domain>/g' /etc/nginx/sites-available/beonedge.conf
sudo ln -s /etc/nginx/sites-available/beonedge.conf /etc/nginx/sites-enabled/
sudo certbot --nginx -d <your-domain>        # provisions + wires TLS certs
sudo nginx -t && sudo systemctl reload nginx
```

`server_name` MUST equal the domain in `BOE_APP/.env` `PUBLIC_LANDING_ORIGIN`.
It proxies `/v1/` → `127.0.0.1:47502` and `/` → `127.0.0.1:3100`.

## How admin / client connect (not containerized)

- **Admin** (local `npm run dev` or app build): point its API base at `https://<your-domain>`
  (calls hit `/v1/...`). Its dev origin (`http://localhost:5173`) is already in the
  `CORS_ORIGIN` default — keep it there.
- **Client APK**: build with the API base = `https://<your-domain>`. `capacitor://localhost`
  / `http://localhost` are already in `CORS_ORIGIN`.

## Security checklist (enforced)

- backend + postgres bound to `127.0.0.1`; only nginx is public (TLS-only, HTTP→HTTPS redirect).
- `NODE_ENV=production` hard-fails on placeholder/weak secrets — fill real values.
- Real secrets live only in the VPS's untracked `BOE_APP/.env`; the committed `.env.example`
  keeps `CHANGE_ME` placeholders (see `release_manager/.gitignore`).
- Signup is gated: landing sends `x-signup-key` (= `SIGNUP_PROXY_SECRET`) + `origin`
  (= `PUBLIC_LANDING_ORIGIN`); the backend rejects account creation from anywhere else.
- Back up Postgres: `docker compose exec postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"`.
```
