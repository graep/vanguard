# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

Vanguard Fleet is an Angular 19 + Ionic 8 PWA for fleet inspection & condition tracking. Firebase is the backend (Auth, Firestore, Storage, Cloud Functions). See `docs/README.md` for full architecture specs.

### Running services

- **Dev server**: `npx ng serve --configuration development` (serves on `http://localhost:4200`). The app redirects unauthenticated users to `/login`; Firebase config is hardcoded as a fallback in `src/app/services/config.service.ts`, so no `.env.local` is required for local dev.
- **Cloud Functions** (`functions/` directory): Optional; only provides email sending. Has its own `package.json` — install separately with `npm install` in `functions/`.

### Lint / Test / Build

| Task | Command | Notes |
|------|---------|-------|
| Lint | `npx ng lint` | Pre-existing lint errors exist in the repo (empty lifecycle methods) |
| Unit tests | `npx ng test --watch=false --browsers=ChromeHeadlessCI` | Uses Karma + Jasmine with Chrome Headless. Some pre-existing test failures (6 of 22). Coverage thresholds set to 80% but current coverage is ~21%. |
| Build (dev) | `npx ng build --configuration development` | Output goes to `www/` |
| Build (prod) | `npm run build:prod` | Runs env validation first |

### Gotchas

- The `failOnEmptyTestSuite` is set to `false` in `karma.conf.js`, so test suites with no specs won't cause failures.
- Ionic icon warnings (`Failed to construct 'URL': Invalid base URL`) appear in Karma tests — these are cosmetic Stencil/Ionic issues in the test environment and do not affect real app behavior.
- The `package.json` `postbuild` hook runs `health:check` which curls `localhost:8080` — it fails gracefully if no server is running.
- ESLint config uses `.eslintrc.json` (not the flat config `eslint.config.js`).
- `functions/` uses ESLint v8 with `.eslintrc.js` — separate from the main app's ESLint setup.
