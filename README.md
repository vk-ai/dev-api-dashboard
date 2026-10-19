# dev-api-dashboard

Learning project: a Next.js + TypeScript developer dashboard for a (mocked) metered API — API-key management, usage and cost charts, an onboarding A/B experiment with a significance test, and Playwright e2e tests with axe accessibility checks. Built on my own time to practise frontend and product-analytics patterns; it is not affiliated with any company and has never served real users.

[![CI](https://github.com/vk-ai/dev-api-dashboard/actions/workflows/ci.yml/badge.svg)](https://github.com/vk-ai/dev-api-dashboard/actions/workflows/ci.yml)

## What it does

| Page | Features |
| --- | --- |
| **Usage** (`/`) | Totals, requests/day and cost/day charts (dependency-free SVG with an accessible data-table fallback), 7/14/30-day range, cost by model |
| **API keys** (`/keys`) | Create / rotate / revoke. Keys are 192-bit random tokens (`dk_demo_…`); only a SHA-256 hash and a short display prefix are stored. The plaintext is returned **once** by `POST /api/keys` and never again. Lookup uses `timingSafeEqual`. Revocation is immediate; rotation = new key with same name + revoke old. Max 10 active keys. |
| **Onboarding** (`/onboarding`) | A/B experiment `onboarding-quickstart-v1`: A = 3-step checklist, B = single-step quickstart with a curl snippet. Assignment = `sha256(experimentId:userId)` bucket, so it is deterministic and the server recomputes the variant (the client cannot pick it). Exposure, step and conversion events are logged. |
| **Experiments** (`/experiments`) | Unique-user conversion rates, two-sided pooled two-proportion z-test, 95% CI for the lift, and a sample-ratio-mismatch (χ²) check |
| **Mock API** (`POST /api/v1/speech`) | Bearer-key auth + usage metering, so a key you create in the UI really shows up as "last used" and in usage. It synthesises nothing. |

## Real results (measured on the seeded data, reproducible)

Seeded experiment: 4,000 synthetic users, seed 42, configured true rates 30% (A) vs 35% (B).

| Variant | Exposed | Converted | Rate |
| --- | --- | --- | --- |
| A (checklist) | 2,009 | 603 | 30.01% |
| B (quickstart) | 1,991 | 709 | 35.61% |

- Lift B − A = **+5.60 pp** (95% CI +2.69 to +8.50 pp), relative +18.6%
- z = 3.769, **p = 1.6e-4** → significant at α = 0.05
- SRM check: χ² = 0.081, p = 0.78 (hash split is balanced)

Because the data is synthetic with known true rates, this validates the **analysis pipeline**, not a product claim that variant B would win with real developers.

Seeded usage (30 days, 2 active keys, fictional pricing): 24,514 requests, 7.34M characters, $1,134.53 estimated cost.

Tests: 21 vitest unit tests (key hashing/rotation/revocation/metering, stats checked against reference values, assignment balance, usage aggregation) and 9 Playwright e2e tests, every page scanned with axe for WCAG 2.0/2.1 A + AA with **zero violations allowed**. All run in CI.

## Real vs mocked

| Part | Status |
| --- | --- |
| Next.js App Router UI, route handlers, TypeScript | **Real** |
| Key generation, SHA-256 hashed storage, shown-once flow, constant-time lookup, rotate/revoke | **Real logic**, but stored in memory |
| Backend / database | **Mocked**: one in-memory store on `globalThis`, seeded deterministically at boot, lost on restart. No SQLite/Postgres, no multi-instance support. |
| Users / auth for the dashboard itself | **None**: single implicit demo account, no login, no CSRF protection, no rate limiting |
| Usage and cost data | **Seeded synthetic** (plus anything you meter through `/api/v1/speech`); pricing is made up |
| `/api/v1/speech` | **Stub**: authenticates and meters; returns no audio |
| Experiment traffic | **Synthetic** 4,000 seeded users + live events from your browser session |
| Statistics | **Real** (z-test, CI, SRM implemented in `src/lib/stats.ts`, unit-tested against hand-computed values) |
| Accessibility | **Real** automated axe scans; no manual screen-reader audit was done |

## Limits

- In-memory state: not durable, not shared across processes or serverless instances.
- The A/B analysis is a fixed-horizon test; no sequential testing / peeking correction, no CUPED, no multiple-variant correction.
- Automated axe checks catch only a subset of accessibility problems.
- `POST /api/dev/reset` exists for tests and is disabled unless `DEMO_ALLOW_RESET=1`.

## Run it

```bash
npm ci
npm run dev                # http://localhost:3000
npm test                   # unit tests
npm run build && npx playwright install chromium && npm run test:e2e
npm run ci                 # lint + typecheck + unit + build + e2e/axe
```

Try the key flow end to end: create a key on `/keys`, then

```bash
curl -X POST http://localhost:3000/api/v1/speech \
  -H "Authorization: Bearer dk_demo_..." -H "content-type: application/json" \
  -d '{"text":"hello world","model":"tts-turbo"}'
```

## Layout

```
src/lib/        apiKeys, keyService, experiment, stats, usage, store (mock)
src/app/api/    route handlers (keys, usage, experiments, v1/speech, dev/reset)
src/components/ UsageView, KeysView, OnboardingView, ExperimentView, BarChart
tests/unit/     vitest
tests/e2e/      Playwright + @axe-core/playwright
```

Stack: Next.js 16 (App Router), React 19, TypeScript, Vitest, Playwright, @axe-core/playwright. No runtime dependencies beyond Next/React.

License: MIT.
