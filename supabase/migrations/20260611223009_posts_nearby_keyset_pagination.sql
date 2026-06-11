-- S1.1 — keyset pagination for posts_nearby.
--
-- The Sprint 1 list view pages through nearby posts. Per the F0.3 perf
-- review, pagination is keyset on (distance_m, id) — never OFFSET (OFFSET
-- re-scans and discards all prior rows; keyset cost stays flat per page).
--
-- Two new trailing parameters, both defaulting to NULL so the signature is
-- backward compatible for existing callers:
--   p_after_distance / p_after_id: the (distance_m, id) cursor of the last
--   row of the previous page. Both NULL = first page. Ties on distance are
--   broken by id, so ORDER BY gains `id` as a deterministic tie-breaker and
--   the cursor uses row-comparison semantics:
--       (distance, id) > (p_after_distance, p_after_id)
--
-- Adding parameters changes the function signature, so CREATE OR REPLACE
-- would create a second overload (and make zero/partial-arg calls ambiguous).
-- The old signature is dropped and the function recreated, with the
-- revoke/grant re-applied to the new signature.

drop function public.posts_nearby(
  double precision, double precision, double precision, uuid,
  public.post_type, public.species, public.post_status, integer
);

-- Posts near a coordinate, optionally filtered. Returns lat/lng as plain
-- doubles (WKB geography is useless to the client) plus the distance for
-- sorting/labels.
--
-- SECURITY DEFINER, deliberately: under SECURITY INVOKER the RLS policy on
-- posts forces the non-leakproof PostGIS operators to evaluate after the
-- security quals, making the GiST index unusable (measured: 53.8ms seq scan
-- vs 8.4ms indexed at 50k posts). The function bypasses RLS and instead
-- inlines the exact public-visibility predicate.
--
-- SECURITY NOTE (security boundary — keep in sync with RLS): the WHERE
-- clause below IS the access control for this code path. It must remain
-- equivalent to the public branch of the "active-city posts are readable by
-- everyone" policy on posts:
--     status in ('activo', 'resuelto') AND city is active
-- That predicate is unconditional, so p_status is clamped to the public set:
-- p_status = NULL means "activo or resuelto", NEVER "any status" (archivado
-- must not leak). The owner-only branch (own archived posts) is intentionally
-- NOT exposed here — owners list their own posts through the table, not this
-- function. radius is capped and results are limited to bound the work anon
-- callers can trigger. The keyset cursor (p_after_distance, p_after_id) only
-- skips rows that already satisfy the boundary predicate — it never widens
-- visibility.
create function public.posts_nearby(
  lat double precision,
  lng double precision,
  radius_m double precision default 5000,
  p_city_id uuid default null,
  p_type public.post_type default null,
  p_species public.species default null,
  p_status public.post_status default 'activo',
  p_limit integer default 100,
  p_after_distance double precision default null,
  p_after_id uuid default null
)
returns table (
  id uuid,
  user_id uuid,
  city_id uuid,
  type public.post_type,
  status public.post_status,
  species public.species,
  title text,
  description text,
  neighborhood_id uuid,
  event_date date,
  has_custody boolean,
  created_at timestamptz,
  lat double precision,
  lng double precision,
  distance_m double precision
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    p.id,
    p.user_id,
    p.city_id,
    p.type,
    p.status,
    p.species,
    p.title,
    p.description,
    p.neighborhood_id,
    p.event_date,
    p.has_custody,
    p.created_at,
    extensions.st_y(p.location::extensions.geometry) as lat,
    extensions.st_x(p.location::extensions.geometry) as lng,
    extensions.st_distance(
      p.location,
      extensions.st_point(posts_nearby.lng, posts_nearby.lat)::extensions.geography
    ) as distance_m
  from public.posts p
  where extensions.st_dwithin(
      p.location,
      extensions.st_point(posts_nearby.lng, posts_nearby.lat)::extensions.geography,
      least(posts_nearby.radius_m, 50000)
    )
    -- SECURITY BOUNDARY: public visibility predicate (see SECURITY NOTE above).
    and p.status in ('activo', 'resuelto')
    and exists (
      select 1 from public.cities c
      where c.id = p.city_id and c.is_active
    )
    and (p_city_id is null or p.city_id = p_city_id)
    and (p_type is null or p.type = p_type)
    and (p_species is null or p.species = p_species)
    and (p_status is null or p.status = p_status)
    -- Keyset cursor: strictly after (p_after_distance, p_after_id) in the
    -- ORDER BY. The distance expression must stay identical to the SELECT's
    -- distance_m so pages tile without overlap or gaps.
    and (
      p_after_distance is null
      or p_after_id is null
      or (
        extensions.st_distance(
          p.location,
          extensions.st_point(posts_nearby.lng, posts_nearby.lat)::extensions.geography
        ),
        p.id
      ) > (p_after_distance, p_after_id)
    )
  order by distance_m, id
  limit least(greatest(coalesce(p_limit, 100), 1), 200);
$$;

-- SECURITY DEFINER functions get EXECUTE to PUBLIC by default — lock it down
-- to the API roles explicitly.
revoke execute on function public.posts_nearby(
  double precision, double precision, double precision, uuid,
  public.post_type, public.species, public.post_status, integer,
  double precision, uuid
) from public;
grant execute on function public.posts_nearby(
  double precision, double precision, double precision, uuid,
  public.post_type, public.species, public.post_status, integer,
  double precision, uuid
) to anon, authenticated;
