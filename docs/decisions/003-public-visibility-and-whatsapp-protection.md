# ADR 003 — Public visibility statuses and `profiles.whatsapp` protection

Status: accepted (F0.3, migration `20260611020106_initial_schema.sql`)

## Context

Two product-data questions had to be settled in the initial schema:

1. **Which post statuses are publicly visible?** Posts move through
   `activo → resuelto → archivado`. Resolved posts are reunion stories that
   people share; their links circulate on WhatsApp and social media. Hiding a
   post the moment it is resolved would break shared links and erase the
   most positive content in the app.

2. **Who can read `profiles.whatsapp`?** WhatsApp is the primary contact
   channel (wa.me deep links), but the product rule says it is visible only
   to authenticated users — browsing never requires an account, yet anonymous
   visitors must not harvest phone numbers.

## Decision

**(a) Public read = `activo` + `resuelto`; `archivado` is hidden.** The posts
SELECT policy (and the inlined predicate in `posts_nearby`, see ADR 002)
exposes both statuses to everyone, scoped to active cities. Owners always see
all of their own posts. This keeps shared links working after resolution and
keeps reunion stories browsable — directly supporting the Fase 2 "feed de
reencuentros" without schema changes.

**(b) `profiles.whatsapp` is protected by column-level grants, not a view.**
The `anon` SELECT grant on `profiles` deliberately omits `whatsapp`;
`authenticated` gets full SELECT. RLS cannot hide a single column, and a
separate public view would duplicate the table for one field; column grants
are enforced by Postgres itself for every PostgREST query shape (see ADR 001
for the revoke-then-grant pattern).

## Consequences

- Resolved posts remain publicly readable indefinitely; archiving is the
  user's tool for removing a post from public view. Feed queries must filter
  `status in ('activo','resuelto')` explicitly to hit the partial index
  (data-layer contract documented in the migration).
- Anonymous users can never read WhatsApp numbers, enforced at the database
  layer regardless of client bugs.
- **Known accepted risk (MVP):** any authenticated user can bulk-read
  `whatsapp` values via `GET /profiles` — creating an account is the only
  barrier to scraping. Mitigation is backlogged for **Sprint 2**: replace the
  direct column read with a per-post contact RPC plus rate limiting, so
  numbers are fetched one at a time with an auditable access pattern.
