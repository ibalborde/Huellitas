# Huellitas — Backlog

> Owner: orchestrator. Status values: `todo | in-progress | review | done | blocked`.
> Mandatory flow per task: implementation → security-auditor → performance-analyst →
> test-engineer (green) → docs-writer → one conventional commit.
> "Principios de ingeniería" in CLAUDE.md are acceptance criteria for every task.

## Fase 0 — Fundaciones

### F0.1 — Expo scaffold
- **Agent:** frontend-designer
- **Status:** done (security ✅ performance ✅ tests 3/3 ✅ docs ✅)
- **Notes:** dark splash variant deferred to F0.4; web stack (react-native-web)
  kept from template (harmless, revisit if CI cost matters); Jest + RNTL 14
  set up here by test-engineer (RNTL 14 `render` is async).
- **Scope:** create-expo-app (managed) with TypeScript strict + expo-router.
  ESLint + Prettier configured. Folder skeleton: `app/`, `src/components/`,
  `src/features/`, `src/theme/`, `src/lib/`, `supabase/`.
- **Acceptance criteria:**
  - `npx tsc --noEmit` passes with `strict: true`.
  - `npm run lint` passes.
  - expo-router renders a placeholder home route.
  - No `any` anywhere; folder structure matches CLAUDE.md conventions.

### F0.2 — Supabase local environment
- **Agent:** backend-engineer
- **Status:** done (security ✅ performance ✅ tests 8/8 ✅ docs ✅)
- **Notes:** `detectSessionInUrl: false` set per perf review; watch for Hermes
  `URL` polyfill need on first real query (perf review, low); cloud-link
  security checklist tracked under F0.2b.
- **Scope:** Supabase CLI installed, `supabase init`, `supabase start` working
  against local Docker. Typed client in `src/lib/supabase.ts` reading URL/keys
  from env (`.env` gitignored, `.env.example` committed). `supabase link` to a
  cloud project deferred until owner provides access token (tracked as F0.2b).
- **Acceptance criteria:**
  - `supabase start` brings up local stack; `supabase status` healthy.
  - `src/lib/supabase.ts` exports a typed client; no keys hardcoded.
  - `.env.example` documents required variables.

### F0.2b — Link cloud Supabase project
- **Agent:** backend-engineer (executed by orchestrator — operational task)
- **Status:** done (2026-06-11). Linked to lpbiznftnivshevqrsjx, migration +
  seed pushed, RLS smoke-tested against cloud (whatsapp/zone_alerts denied,
  posts_nearby clamped). Auth-related checklist items below DEFERRED to the
  Sprint 2 auth task (no auth flows exist yet); must be done before any
  public/production use:
- **Security checklist before production (from F0.2 audit):**
  - [ ] `auth.email.enable_confirmations = true`
  - [ ] `minimum_password_length >= 8` + `password_requirements = "letters_digits"`
  - [ ] `api.auto_expose_new_tables = false` (explicit)
  - [ ] Enable captcha (hcaptcha/turnstile) for signup
  - [ ] `secure_password_change = true`
  - [ ] Per-bucket file size limit (~10MiB) + `allowed_mime_types` when creating buckets
  - [ ] Add app deep link scheme to auth redirect allow-list (exact, no wildcards)

### F0.3 — Migration 0001: multi-city schema + RLS + seed
- **Agent:** database-architect
- **Status:** done (security ✅ after 1 fix round · performance ✅ after 1 fix
  round · tests 8 unit + 20 integration ✅ · docs ✅ ADRs 001-003)
- **Notes:** schema also ships comments + zone_alerts (cheap now). posts_nearby
  RPC already implemented here → S1.1 reduced to verification/EXPLAIN pass.
  Feed queries MUST send `status=in.(activo,resuelto)` explicitly or the
  partial index is skipped (documented in migration + ARCHITECTURE.md).
- **Scope:** Full schema per database-architect brief: cities, neighborhoods,
  profiles, posts, post_media (status `pending` by default, MVP auto-approve
  wired), enums, PostGIS geography columns, indexes (GiST on locations),
  RLS on every table, seed for Rosario + neighborhoods.
- **Acceptance criteria:**
  - `supabase db reset` applies migration + seed without errors.
  - RLS enabled on all tables; anonymous can read active posts/approved media
    only; only owners mutate their rows; unapproved media never readable.
  - No logic assumes Rosario: city comes from data, not constants.
  - Types generated into `src/lib/database.types.ts`.

### F0.4 — Theming system + base components
- **Agent:** frontend-designer
- **Status:** done (security ✅ performance ✅ tests 81/81 ✅ docs ✅)
- **Notes:** brand color adjusted from base coral to AA-safe variants per mode
  (documented in colors.ts). Perf debt noted, measure at F1: useTheme
  registers an Appearance listener per consumer; useThemedStyles has no
  cross-instance cache. Input nativeID fixed to useId() post-review.
- **Scope:** `src/theme/` with semantic tokens (light + dark), ThemeProvider
  following system scheme, `useTheme` hook. Base components in
  `src/components/`: Button, Badge, Card, Input, EmptyState.
- **Acceptance criteria:**
  - Zero hardcoded hex colors in components (only theme tokens).
  - Both modes render correctly; AA contrast on both.
  - Touch targets >= 44pt; accessibility labels on interactive elements.
  - Components typed, < 150 lines each, variants via props/composition.

### F0.5 — CI pipeline
- **Agent:** backend-engineer
- **Status:** done (security ✅ with fixes applied · tests ✅ local · docs ✅)
- **Notes:** integration job runs on PRs only (cost choice, documented in
  YAML). permissions contents:read, persist-credentials false, CLI pinned
  2.105.0, .nvmrc added. Real CI run pending first push to GitHub remote.
- **Scope:** GitHub Actions workflow: typecheck + lint + jest on every push/PR.
- **Acceptance criteria:**
  - Workflow YAML valid; runs `tsc --noEmit`, `lint`, `test` with npm cache.
  - Fails the build on any error.

## Fase 1 — Sprint 1: Explorar (solo lectura)

### S1.1 — RPC posts_nearby
- **Agent:** database-architect
- **Status:** done (core RPC shipped in F0.3; S1.1 added keyset pagination,
  migration 20260611223009 — security ✅ re-review per ADR 002, perf ✅
  EXPLAIN GiST verified, tests 81 unit + 20 integration ✅)
- **Notes for S1.2:** data layer must send cursor fields together-or-neither
  (half cursor silently resets to page 1); integration tests should add
  multi-page keyset cases with distance ties (security re-review request).

### S1.2 — Posts data layer + usePosts hook
- **Agent:** backend-engineer
- **Status:** done (security ✅ performance ✅ after 1 fix round · tests
  106 unit + 29 integration ✅ · docs ✅)
- **Notes:** also shipped cities feature + CityProvider (city scoping by
  construction) + lazy supabase client + React Query/Zustand install.
  S1.4 MUST use its own viewport-bounded query for map pins, never the
  infinite feed query (documented in ARCHITECTURE.md). GPS only in
  in-memory query keys — re-review before adding RQ persistence.

### S1.3 — Home screen: map/list toggle + filters
- **Agent:** frontend-designer
- **Status:** todo
- **Scope:** Home route with map/list toggle, filter bar (type, species,
  radius, date). Filters in local state (Zustand), data via usePostsNearby.
- **Acceptance criteria:** works logged-out (read never requires account);
  both themes; accessible filters; list paginated with FlatList perf props.

### S1.4 — Map with status-colored pins + clustering
- **Agent:** frontend-designer
- **Status:** todo
- **Scope:** react-native-maps, pin color by post type/status (theme tokens),
  basic clustering, recenter-to-city control (active city from CityProvider).
- **Acceptance criteria:** no Rosario hardcoding; smooth with 200+ pins
  (performance-analyst gate); both themes.

### S1.5 — Post detail with gallery
- **Agent:** frontend-designer
- **Status:** todo
- **Scope:** `app/post/[id]` route: photo gallery (approved media only),
  post data, map snippet, contact CTA placeholder (Sprint 2 wires WhatsApp).
- **Acceptance criteria:** deep-linkable route; loading/error/empty states;
  both themes; gallery images lazy/cached.

## Hardening backlog (from F0.3 security audit — not blocking Fase 0)
- [ ] Sprint 2: whatsapp exposed via per-post contact RPC + rate limiting
      instead of table-wide authenticated read (ADR 003 known risk).
- [ ] Sprint 2 (storage task): bucket policies + `storage_path` prefix check
      so a media row can't point at another user's storage object.
- [ ] Sprint 3: cap media rows per post; general rate limiting for
      posts/comments; reports table (denuncias — already planned).
- [ ] Fase 2: `location_precision` flag on posts (round to block) — add column
      early in next migration to avoid painful migration later.

## Decisions log
See `docs/decisions/`: 001 revoke-then-grant column-scoped privileges,
002 posts_nearby SECURITY DEFINER boundary, 003 public visibility +
whatsapp protection.
