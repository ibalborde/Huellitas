# Architecture

High-level view of Huellitas as of S1.2 (cities + posts data layer, React
Query wiring, CityProvider). This document describes what the code does
today; planned work is marked as such.

## Client layers (Clean Architecture, pragmatic)

Dependencies always point inward. Swapping Supabase out must only touch the
data layer.

| Layer | Location | Rules |
| --- | --- | --- |
| Domain | `src/features/X/domain/` | Pure types, entities, business rules. No React/Supabase/Expo imports. |
| Data | `src/features/X/data/` | Repositories talking to Supabase. Only layer that may import `src/lib/database.types.ts`. Returns domain types, never raw rows. |
| Application | `src/features/X/hooks/` | Hooks orchestrating repositories with React Query; expose use cases to the UI. |
| Presentation | `src/features/X/components/`, `app/` | Render and dispatch actions only. No business logic, no direct Supabase calls. |

The layers are no longer a skeleton: `src/features/cities/` and
`src/features/posts/` implement all four. Each feature exposes a public API
through its `index.ts` (domain types, hooks, providers); the repository
modules are internal — imported only by the feature's hooks and by
integration tests. Repositories are created by a factory
(`createSupabase*Repository(getClient)`) with an injectable client accessor,
so tests can swap the backend without touching consumers (the `PostsRepository`
/ `CitiesRepository` interfaces are the seam).

Shared infrastructure: `src/lib/` (see "Client data flow" below),
`src/theme/` (semantic light/dark tokens), `src/components/` (shared
presentation-only UI: `Button`, `Badge`, `Card`, `Input`, `EmptyState`),
`app/` (expo-router routes).

## Client data flow

### Provider stack

`app/_layout.tsx` mounts, outermost first:
`ThemeProvider` → `QueryClientProvider` → `CityProvider`. The `QueryClient`
lives at module scope (one instance for the app's lifetime) and is built by
`src/lib/queryClient.ts` with mobile-sensible defaults: `staleTime` 60 s
(avoids refetch storms on focus/navigation) and `retry: 1` (more retries just
delay the error state on flaky mobile networks).

### Lazy Supabase client

`src/lib/supabase.ts` no longer creates the client at module evaluation.
Repositories import the accessor `getSupabaseClient()`, which creates the
typed client on first call and throws if `EXPO_PUBLIC_SUPABASE_URL` /
`EXPO_PUBLIC_SUPABASE_ANON_KEY` are missing. This keeps every data-layer
module importable without env configuration (unit tests, tooling), and a
misconfiguration surfaces as an error on the first backend call — inside
React Query's error handling — instead of crashing app startup.

### Errors and geo primitives

- `src/lib/errors.ts` — `DataError` carries a technical `message` (logs) plus
  a `userMessage` in es-AR ready to render. Repositories never swallow
  backend errors: they wrap and rethrow, so React Query exposes them via its
  error state. `getUserMessage(error)` is the UI-side accessor with a generic
  es-AR fallback.
- `src/lib/geo.ts` — pure `Coordinates` type and rounding helpers, importable
  from any layer including domain.
- `src/features/cities/data/ewkb.ts` — minimal hex EWKB **point** decoder:
  PostgREST serializes PostGIS `geography` columns as hex EWKB, and
  `cities.center` is the only geography the client reads. Any other shape is
  a `DataError` by design.

### CityProvider (multi-city invariant)

`CityProvider` (`src/features/cities/components/`) loads active cities via
`useActiveCities` (catalog data, 1 h `staleTime`) and exposes
`activeCity` through `useActiveCity()`. The default is the **first active
city returned by the backend** (launch order) — never a hardcoded one.
`activeCity` is `null` while cities load; consumers gate their queries on it.

City scoping is guaranteed **by construction**: `usePostsNearby` reads the
active city from the provider itself — callers cannot pass a `cityId` — and
the query stays disabled until a city is resolved, so unscoped geo queries
are unrepresentable in the UI layer.

### `usePostsNearby` (infinite nearby feed)

`useInfiniteQuery` over `postsRepository.fetchNearby` (the `posts_nearby`
RPC). Contracts worth knowing before touching it:

- **Keyset cursor, both-fields-or-neither.** Pagination is keyset over
  `(distance_m, id)`. The SQL function treats a half cursor as "no cursor"
  and silently restarts from page 1, so the cursor travels as one
  `PostsNearbyCursor` object that exists complete or not at all.
- **Center rounded to 3 decimals (~111 m) in the hook**, before it reaches
  the query key, so normal GPS jitter does not churn the cache with
  near-identical entries. The same rounded center is sent to the server: key
  and request always match.
- **Radius clamped client-side too** (`RADIUS_MAX_M` = 50 km), defense in
  depth on top of the SQL cap.
- **`maxPages: 5`.** Bounds memory AND refetch cost: React Query v5 refetches
  every cached page **sequentially** when an infinite query refreshes.
- **Page size** `POSTS_PAGE_SIZE` = 20, clamped 1–200 mirroring the SQL
  clamp so the `nextCursor` math sees the real page size.

> **Design note for S1.4 (map screen):** the map must NOT consume this
> infinite query for its pins. With `maxPages`, scrolling the list far enough
> evicts the *nearest* pages, so the map would drop the closest pins; without
> `maxPages`, every refresh cascades through all cached pages. The map needs
> its own viewport-bounded (bounding-box) snapshot query. Feed = paginated
> list; map = bounding-box snapshot.

> **Security caveat:** the user's (rounded) GPS coordinates live only in
> in-memory React Query keys today. If query persistence (e.g.
> `persistQueryClient`) is ever added, location data would be written to
> disk — re-review this before enabling persistence.

## Theming

All UI styling flows through semantic tokens in `src/theme/`:

- **Tokens** — `colors.ts` (semantic light + dark palettes: surfaces, text,
  brand, and per-post-type status colors `lost`/`found`/`sighted`, each with a
  strong color for pins/icons and a Soft/Text pair for badges), `spacing.ts`
  (base-4 scale `xs`–`xxl`), `radii.ts`, `typography.ts` (type scale without
  color — composed with a color token at the call site). `theme.ts` assembles
  them into `lightTheme`/`darkTheme` and exports `MIN_TOUCH_TARGET = 44`
  (minimum touch target in pt, a11y rule).
- **Provider** — `ThemeProvider` (mounted once in `app/_layout.tsx`) follows
  the system color scheme via `useColorScheme`; there is no in-app theme
  switch. Components consume the active theme through `useTheme()` or
  `useThemedStyles(factory)` (memoized themed `StyleSheet`; define the factory
  at module scope so its identity is stable). `useTheme()` falls back to the
  system scheme outside a provider, so components stay renderable in
  isolation. The splash screen ships a dark variant in `app.json`.
- **No-hex rule** — `src/theme/colors.ts` is the only place in `src/` where
  hex values are allowed (plus native config in `app.json`). Components never
  hardcode colors; they consume tokens, including the `BadgeVariant` mapping
  of post types to status tokens.
- **AA enforcement** — WCAG contrast is verified by pure-math unit tests in
  `__tests__/src/theme/contrast.test.ts`, run over **both** palettes: >= 4.5:1
  for every text-bearing token pair, >= 3:1 for graphics-only status colors.
  A palette change that breaks AA fails CI; the ratios documented in the
  `colors.ts` header must match these measurements. Components are also
  rendered and asserted in both modes (see Testing).

## Backend: Supabase

Postgres + PostGIS (geography columns, GiST indexes), Auth, Storage and Edge
Functions, run locally via the Supabase CLI (`supabase start`). The schema
lives in `supabase/migrations/`; seed data in `supabase/seed.sql`. The client
talks to Postgres through PostgREST with the `anon`/`authenticated` roles —
table grants plus RLS are the security model (see below).

## Data model

```mermaid
erDiagram
    cities ||--o{ neighborhoods : "has"
    cities ||--o{ posts : "scopes"
    cities ||--o{ zone_alerts : "scopes"
    cities ||--o{ profiles : "home_city_id (optional)"
    profiles ||--o{ posts : "writes"
    profiles ||--o{ comments : "writes"
    profiles ||--o{ zone_alerts : "owns"
    posts ||--o{ post_media : "has"
    posts ||--o{ comments : "has"
    neighborhoods ||--o{ posts : "neighborhood_id (optional)"

    cities { uuid id PK; text slug UK; geography center; geography bounds; bool is_active }
    neighborhoods { uuid id PK; uuid city_id FK; text name; geography center }
    profiles { uuid id "PK = auth.users.id"; text display_name; text whatsapp "auth-only read"; uuid home_city_id FK }
    posts { uuid id PK; uuid user_id FK; uuid city_id FK "trigger-derived"; post_type type; post_status status; species species; geography location; date event_date; bool has_custody }
    post_media { uuid id PK; uuid post_id FK; media_type media_type; text storage_path; media_status moderation_status "default pending"; smallint position }
    comments { uuid id PK; uuid post_id FK; uuid user_id FK; text body; geography location "optional" }
    zone_alerts { uuid id PK; uuid user_id FK; uuid city_id FK; geography center; int radius_m; species species "NULL = any"; text push_token "owner-only" }
```

Enums: `post_type` (perdido/encontrado/avistado), `post_status`
(activo/resuelto/archivado), `species` (gato/perro/otro), `media_type`
(photo/video), `media_status` (pending/approved/rejected).

## Key invariants

### Multi-city
Cities are data, not code. `posts.city_id` is **always derived from
`location`** by the `assign_post_city` trigger (before insert / update of
location); the column-scoped UPDATE grant blocks direct `city_id` writes, so a
client can never claim a different city. A post outside every active city's
`bounds` is rejected. Deactivating a city (`is_active = false`) hides all its
posts from public reads everywhere.

### Moderation pipeline
`post_media.moderation_status` defaults to `'pending'` and the moderation
columns are **never client-writable** (column-scoped grants). The MVP
auto-approves via the `mvp_auto_approve_media` trigger; Fase 2 activates AI
moderation by dropping that trigger — no data migration. Non-approved media is
only visible to the post owner.

### RLS + grants summary
Grants define the maximum surface per role; RLS then filters rows. Every
table revokes Supabase's auto-grants first, then grants explicitly (ADR 001).

| Table | anon read | authenticated read | write |
| --- | --- | --- | --- |
| cities, neighborhoods | all rows | all rows | migrations / service_role only |
| profiles | all rows, **without `whatsapp`** | all rows incl. `whatsapp` | owner updates own (id/created_at immutable) |
| posts | activo+resuelto in active cities | same + own posts (any status) | owner CRUD; insert/update column-scoped (no id/created_at/city_id) |
| post_media | approved media of visible posts | same + all media of own posts | owner CRUD; moderation columns never writable |
| comments | comments of visible posts | same | owner CRUD; post_id/user_id immutable after insert |
| zone_alerts | none (push tokens) | own rows only | owner-only, full CRUD |

`profiles` rows are auto-created by the `handle_new_user` trigger
(SECURITY DEFINER) on auth signup; the display name never derives from the
email (profiles are world-readable).

## RPC functions

- **`resolve_city(lat, lng)`** — returns the active city whose `bounds` cover
  the coordinate (app start / GPS). SECURITY INVOKER: cities are public.
- **`posts_nearby(lat, lng, radius_m, p_city_id, p_type, p_species, p_status,
  p_limit, p_after_distance, p_after_id)`** — posts within a radius, ordered
  by `(distance_m, id)`, with `lat`/`lng`/`distance_m` as plain doubles.
  Keyset-paginated: `(p_after_distance, p_after_id)` is the last row of the
  previous page; if either is NULL the cursor is ignored and the result
  restarts from page 1 (the client sends both or neither). The cursor only
  skips rows that already satisfy the visibility predicate — it never widens
  visibility. **SECURITY DEFINER** (ADR 002): PostGIS operators are not
  leakproof, so under RLS the GiST index is unusable. The function bypasses
  RLS and inlines the exact public-visibility predicate
  (`status in ('activo','resuelto')` AND active city) — its WHERE clause **is
  a security boundary** and must stay in sync with the public branch of the
  posts SELECT policy. Guards: `p_status = NULL` means the public set, never
  "any status" (default `'activo'`); radius capped at 50 km; `p_limit`
  clamped to 1–200 (default 100). EXECUTE is revoked from PUBLIC and granted
  only to anon/authenticated.

Feed queries through the table (not the RPC) must include the explicit filter
`status=in.(activo,resuelto)` so the planner can use the partial index
`posts_city_created_public_idx` (RLS alone cannot prove the index predicate).

## Testing strategy

Two Jest suites, split by config:

- **Unit** (`npm test`): jest-expo preset, `__tests__/**/*.test.ts(x)`
  excluding `__tests__/integration/`. Components, hooks, domain logic; no
  network. Shared components are tested in **both** color modes via
  `renderWithTheme` from `__tests__/src/helpers/theme-testing.tsx`; that
  helper is the only reliable way to force a scheme under jest-expo (it sets
  the preset's `useColorScheme` module mock — spying on `Appearance` has no
  effect because the preset replaces the whole module).
- **Integration** (`npm run test:integration`): `jest.integration.config.js`,
  `--runInBand`, runs `__tests__/integration/`. Talks to the **local Supabase
  stack** (requires `supabase start`) and asserts the security boundaries:
  anon column access (no `whatsapp`), RLS visibility branches, column-scoped
  grants, and `posts_nearby` clamping. These tests are the regression net for
  ADRs 001–003.
