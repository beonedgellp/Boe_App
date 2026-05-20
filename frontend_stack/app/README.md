# BeOnEdge — App

Vite + React starter wired to the BeOnEdge design system.

## Run

```bash
cd app
npm install
npm run dev
```

Opens at http://localhost:5173.

## Android APK

This app is wrapped with Capacitor for Android. Browser builds keep all routes; Android builds set `VITE_BEO_APP_TARGET=client`, so the APK redirects to the client app surface under `/app/*` and does not expose website/admin routes.

Build and sync Android assets:

```bash
npm run android:sync
```

Build the debug APK:

```bash
cd android
gradle assembleDebug --console=plain
```

The debug APK is written to:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## Emulator Testing

Start the existing emulator:

```bash
emulator -avd boe_pixel_api36 -gpu host -no-snapshot-load
```

From the repository root, run the helper:

```bash
emu/boe_update.sh
```

The helper:

- detects a running `emulator-*` device
- waits for boot completion
- runs `npm run android:sync`
- runs `gradle assembleDebug --console=plain`
- creates/verifies `adb reverse tcp:47502 tcp:47502`
- installs `app-debug.apk`
- launches `com.beonedge.app`

If the backend uses a different port:

```bash
BACKEND_PORT=47500 emu/boe_update.sh
```

## Routes

- `/`         — landing (links to all surfaces)
- `/website`  — public onboarding website
- `/apk`      — client mobile app preview (in phone bezel)
- `/app/*`    — integrated client app routes intended for mobile shell/APK use
- `/admin`    — admin console

## Mobile Data Mode

The mobile service adapters default to local fixtures so visual development does not depend on backend availability.

```bash
VITE_BEO_API_MODE=fixture
VITE_BEO_API_BASE_URL=http://127.0.0.1:47500
```

Set `VITE_BEO_API_MODE=http` to call the backend controller. The adapters keep the existing screen return shapes stable while PostgreSQL-backed services are filled in.

For emulator testing, `127.0.0.1` inside the APK is mapped back to the host by ADB:

```bash
adb reverse tcp:47502 tcp:47502
```

`emu/boe_update.sh` creates and verifies this mapping automatically.

## Structure

```
app/
  index.html               — Vite entry
  vite.config.js
  package.json
  src/
    main.jsx               — bootstraps React + Router
    App.jsx                — top-level routes
    styles/
      tokens.css           — copy of /colors_and_type.css
      kit.css              — copy of /ui_kits/shared/kit.css
    routes/
      Landing.jsx
      Website.jsx
      Apk.jsx
      Admin.jsx
    components/
      website/             — ported from /ui_kits/website/Components.jsx
      apk/                 — ported from /ui_kits/apk/Components.jsx
      admin/               — ported from /ui_kits/admin/Components.jsx
    assets/                — logo svgs (copied from /assets)
```

## Notes

- Icons use `lucide-react` (npm package) instead of the CDN `<i data-lucide=...>` pattern from the static kits. Same icon set, idiomatic React API.
- Components were ported by hand. If you change tokens in `/colors_and_type.css` upstream, mirror them into `app/src/styles/tokens.css`.
- See `/SKILL.md` and `/README.md` at the repo root for the full design system brief.
