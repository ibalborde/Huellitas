# ADR 001 — Revoke-then-grant, column-scoped privileges on every table

Status: accepted (F0.3, migration `20260611020106_initial_schema.sql`)

## Context

Supabase configures default privileges so that every new table in `public`
automatically grants ALL to the `anon` and `authenticated` API roles. RLS
filters rows, but it cannot hide individual columns — and a table-wide grant
silently re-exposes anything we intended to restrict.

This bit us in the first version of the initial schema: `profiles.whatsapp`
was meant to be readable only by authenticated users, but the auto-granted
SELECT on `profiles` let `anon` read it. The leak was silent — no error, no
warning, just a column visible to the world through PostgREST.

Beyond reads, table-wide INSERT/UPDATE grants would also let clients write
columns that must only be set by the database itself: `id`, `created_at`
(a spoofed future timestamp pins a post on top of the feed), `posts.city_id`
(derived from location by trigger), and `post_media.moderation_status` /
`moderation_reason` (an owner could self-approve media and bypass the
moderation pipeline).

## Decision

Every migration that creates a table MUST:

1. `revoke all on table ... from anon, authenticated;` immediately, so the
   grants that follow are the *complete* API surface (service_role keeps its
   grants).
2. Grant explicitly per role, and **column-scoped** for any client-writable
   table:
   - `id` and `created_at` are never client-writable — they always fall to
     their defaults.
   - Trigger-derived columns (`posts.city_id`) are excluded from INSERT
     intent-wise and from UPDATE entirely.
   - Moderation fields (`post_media.moderation_status`,
     `moderation_reason`) are never client-writable; only triggers and the
     Fase 2 service_role pipeline may set them.
   - Sensitive read columns use column-scoped SELECT (e.g. the `anon` grant
     on `profiles` omits `whatsapp`).

We chose column grants over a public view for `profiles` because a view would
duplicate the table for a single field, while column grants are enforced by
Postgres itself for every PostgREST query shape.

## Consequences

- The pattern is **mandatory in every future migration** that creates a
  table; reviews (security-auditor) reject migrations that rely on default
  privileges.
- Integration tests (`__tests__/integration/`) assert the boundaries: anon
  cannot read `whatsapp`, clients cannot write moderation fields, immutable
  columns reject updates. A regression fails CI instead of leaking silently.
- Slight verbosity per migration, and adding a legitimately client-writable
  column now requires an explicit grant change — which is the point: exposure
  is always a deliberate, reviewable diff.
