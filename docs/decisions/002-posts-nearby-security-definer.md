# ADR 002 — `posts_nearby` as SECURITY DEFINER with inlined visibility predicate

Status: accepted (F0.3, migration `20260611020106_initial_schema.sql`).
Amended in S1.1 (migration `20260611223009_posts_nearby_keyset_pagination.sql`):
function recreated with a 10-parameter signature adding a keyset cursor
(`p_after_distance`, `p_after_id`) — pure AND-conjunct, boundary predicate
unchanged, re-reviewed by security-auditor per this ADR's mandate.
Amended in S1.3a (migration `20260612120000_posts_nearby_event_date_filter.sql`):
recreated with a 12-parameter signature adding `p_event_from`/`p_event_to`
date filters — pure AND-conjuncts on public data, boundary predicate
unchanged, re-reviewed and approved per this ADR's mandate.
Amended in security hardening (migration `20260615000001_security_hardening.sql`):
`p_status` parameter removed entirely (CRIT-1 finding: the parameter
accepted `'archivado'`, relying on defense-in-depth from the first
AND-conjunct; removing it makes the SECURITY BOUNDARY self-contained).
The function now returns both `'activo'` and `'resuelto'` posts unconditionally
(the TypeScript repo never passed `p_status`; behavior now matches the intent
of the public RLS policy). Re-reviewed by security-auditor.

## Context

The core geo query — "posts within N meters of a coordinate" — uses PostGIS
`ST_DWithin` backed by a GiST index on `posts.location`.

PostGIS operators are **not marked leakproof**. Under RLS with a SECURITY
INVOKER function, Postgres must evaluate the security quals (the RLS policy)
*before* any non-leakproof expression, which prevents the planner from using
the GiST index for the distance filter. The query degrades to a sequential
scan: measured **53.8 ms (seq scan) vs 8.4 ms (indexed)** at 50k posts —
and the gap grows with data volume on the hottest query in the app.

## Decision

`posts_nearby` is **SECURITY DEFINER**: it bypasses RLS so the planner can
use the GiST index, and instead **inlines the exact public-visibility
predicate** in its WHERE clause:

```
status in ('activo', 'resuelto') AND city is active
```

This must remain equivalent to the public branch of the posts SELECT policy
("active-city posts are readable by everyone"). The owner-only branch (own
archived posts) is deliberately NOT exposed here — owners list their own
posts through the table.

Hardening, because the function runs with definer privileges and is callable
by `anon`:

- `p_status` is **clamped to the public set**: NULL means "activo or
  resuelto", never "any status" (`archivado` must not leak).
- `radius_m` is capped at 50 km (`least(radius_m, 50000)`).
- `p_limit` is clamped to 1–200 (`least(greatest(coalesce(p_limit, 100), 1),
  200)`), bounding the work anonymous callers can trigger.
- EXECUTE is revoked from PUBLIC (SECURITY DEFINER functions get it by
  default) and granted only to `anon, authenticated`.

## Consequences

- The function's WHERE clause **is a security boundary**, duplicated from the
  RLS policy. Any change to the posts public-visibility rule must update both
  places, and any edit to `posts_nearby` requires re-review by
  security-auditor before merge.
- Integration tests cover the boundary (archived posts and inactive-city
  posts never returned, regardless of `p_status`; radius/limit clamps), so
  drift between the function and the RLS policy fails CI.
- We accept the maintenance cost of one deliberate RLS bypass in exchange for
  index-backed performance on the app's primary query path.
- The `p_status` parameter has been permanently removed (migration
  `20260615000001`). To expose status-level filtering in a future feature,
  add a new parameter constrained to the public set at the function level
  (via a plpgsql language check) — do not restore the old parameter silently.
