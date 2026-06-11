# Architecture

High-level view of Huellitas as of F0.3 (initial schema). This document
describes what the code does today; planned work is marked as such.

## Client layers (Clean Architecture, pragmatic)

Dependencies always point inward. Swapping Supabase out must only touch the
data layer.

| Layer | Location | Rules |
| --- | --- | --- |
| Domain | `src/features/X/domain/` | Pure types, entities, business rules. No React/Supabase/Expo imports. |
| Data | `src/features/X/data/` | Repositories talking to Supabase. Only layer that may import `src/lib/database.types.ts`. Returns domain types, never raw rows. |
| Application | `src/features/X/hooks/` | Hooks orchestrating repositories with React Query; expose use cases to the UI. |
| Presentation | `src/features/X/components/`, `app/` | Render and dispatch actions only. No business logic, no direct Supabase calls. |

Shared infrastructure: `src/lib/supabase.ts` (typed singleton client),
`src/theme/` (semantic light/dark tokens), `app/` (expo-router routes).

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
  p_limit)`** — posts within a radius, sorted by distance, with `lat`/`lng`/
  `distance_m` as plain doubles. **SECURITY DEFINER** (ADR 002): PostGIS
  operators are not leakproof, so under RLS the GiST index is unusable. The
  function bypasses RLS and inlines the exact public-visibility predicate
  (`status in ('activo','resuelto')` AND active city) — its WHERE clause **is
  a security boundary** and must stay in sync with the public branch of the
  posts SELECT policy. Guards: `p_status = NULL` means the public set, never
  "any status"; radius capped at 50 km; `p_limit` clamped to 1–200. EXECUTE
  is revoked from PUBLIC and granted only to anon/authenticated.

Feed queries through the table (not the RPC) must include the explicit filter
`status=in.(activo,resuelto)` so the planner can use the partial index
`posts_city_created_public_idx` (RLS alone cannot prove the index predicate).

## Testing strategy

Two Jest suites, split by config:

- **Unit** (`npm test`): jest-expo preset, `__tests__/**/*.test.ts(x)`
  excluding `__tests__/integration/`. Components, hooks, domain logic; no
  network.
- **Integration** (`npm run test:integration`): `jest.integration.config.js`,
  `--runInBand`, runs `__tests__/integration/`. Talks to the **local Supabase
  stack** (requires `supabase start`) and asserts the security boundaries:
  anon column access (no `whatsapp`), RLS visibility branches, column-scoped
  grants, and `posts_nearby` clamping. These tests are the regression net for
  ADRs 001–003.
