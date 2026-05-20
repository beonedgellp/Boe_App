# BeOnEdge (BOE)

Full-stack investment platform — React frontend, Node.js backend, JSON/PostgreSQL data store.

## Quick Start

```bash
# Boot backend + frontend in one command
cd backend_controller
node scripts/start-dev.js --with-frontend

# Or run separately:
# Backend only:  node scripts/start-dev.js
# Frontend only: cd ../frontend_stack/app && npm run dev
```

## Project Structure

| Directory | Purpose |
|---|---|
| `backend_controller/` | Node.js HTTP API server |
| `emu/` | Android emulator helper scripts |
| `frontend_stack/app/` | React + Vite frontend |
| `resources/app-map/` | Architecture docs & route maps |
| `resources/` | Supporting docs, prompts, notes, transcripts, and reference materials |
| `resources/testing/` | Smoke-test outputs and test run summaries |

## Setup

1. **Backend:** See [`backend_controller/README.md`](backend_controller/README.md)
2. **Frontend:** See [`frontend_stack/README.md`](frontend_stack/README.md)
3. **Testing guide:** See [`resources/docs/TESTING_GUIDE.md`](resources/docs/TESTING_GUIDE.md)
4. **Agent handoff plan:** See [`resources/agent/AGENT_PLAN.md`](resources/agent/AGENT_PLAN.md)
5. **Seed data:** `cd backend_controller && node scripts/seed-smoke-data.js`
6. **Auth smoke test:** `cd backend_controller && node scripts/smoke-client-auth.js`
7. **Round-trip smoke tests:** `cd backend_controller && node scripts/smoke-test.js`

## Android Emulator Testing

The Android client is a Capacitor wrapper around `frontend_stack/app` and bundles only the client-side app surface. The backend remains separate and is reached over HTTP/HTTPS.

Prerequisites already used on this machine:

- Android SDK: `/home/nethunter07/Android/Sdk`
- Android Studio: `/opt/android-studio/bin/studio.sh`
- Gradle: use the checked-in Android wrapper at `frontend_stack/app/android/gradlew`
- Emulator AVD: `boe_pixel_api36`

Start the emulator:

```bash
emulator -avd boe_pixel_api36 -gpu host -no-snapshot-load
```

With the backend running on `127.0.0.1:47502`, rebuild, reinstall, set up `adb reverse`, and launch the APK:

```bash
emu/boe_update.sh
```

Use a different backend port if needed:

```bash
BACKEND_PORT=47500 emu/boe_update.sh
```

The script detects a running emulator, waits for boot completion, runs `npm --workspace app run android:sync`, builds the debug APK with `./gradlew`, establishes `adb reverse tcp:$BACKEND_PORT tcp:$BACKEND_PORT`, installs the APK, and launches `com.beonedge.app`.

## Environment

Copy `.env.example` to `.env` in both `backend_controller/` and project root.
Key vars: `DATA_STORE=json`, `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`.

## Tech Stack

- **Frontend:** React 18, Vite, React Router, Zustand
- **Backend:** Node.js 22, custom HTTP router, JWT auth
- **Data:** JSON file (dev) / PostgreSQL (prod)
- **Container:** Docker + Docker Compose
