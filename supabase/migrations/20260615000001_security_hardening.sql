-- Security hardening for S1.3 review (two findings).
--
-- 1. Remove p_status from posts_nearby (CRIT-1).
--    p_status accepted 'archivado' from any anonymous caller. The first
--    AND-conjunct blocked it, but the contract was fragile: one future
--    refactor dropping that conjunct would silently leak archived posts.
--    The TypeScript repository never passed p_status (server used default
--    'activo'). Removing the parameter makes the SECURITY BOUNDARY
--    self-contained and changes the behavior to include 'resuelto' posts —
--    intentional, since resolved posts are publicly visible per RLS and
--    provide useful "happy ending" context in the feed.
--
-- 2. Harden post_media SELECT policy (HIGH-2).
--    The approved-branch EXISTS checked only post_id, relying on posts'
--    own RLS to exclude archived and inactive-city rows. Tightening the
--    predicate here decouples the two policies: relaxing the posts RLS in
--    a future sprint won't silently widen media visibility.

-- ─── 1. posts_nearby: drop 12-param overload, recreate without p_status ────

drop function public.posts_nearby(
  double precision, double precision, double precision, uuid,
  public.post_type, public.species, public.post_status, integer,
  double precision, uuid, date, date
);

-- Posts near a coordinate, publicly filtered. Returns lat/lng as plain
-- doubles plus distance_m for sorting and display labels.
--
-- SECURITY DEFINER (see ADR 002): bypasses RLS so PostGIS operators can use
-- the GiST index; inlines the exact public-visibility predicate instead.
--
-- SECURITY BOUNDARY — keep in sync with the posts SELECT RLS policy:
--     status in ('activo', 'resuelto') AND city is active
-- radius is capped at 50 km and results are limited to bound the work that
-- anonymous callers can trigger. The keyset cursor and date filters are
-- pure AND-conjuncts — they only narrow results, never widen visibility.
create function public.posts_nearby(
  lat double precision,
  lng double precision,
  radius_m double precision default 5000,
  p_city_id uuid default null,
  p_type public.post_type default null,
  p_species public.species default null,
  p_limit integer default 100,
  p_after_distance double precision default null,
  p_after_id uuid default null,
  p_event_from date default null,
  p_event_to date default null
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
    -- SECURITY BOUNDARY: public visibility predicate (see ADR 002).
    and p.status in ('activo', 'resuelto')
    and exists (
      select 1 from public.cities c
      where c.id = p.city_id and c.is_active
    )
    and (p_city_id is null or p.city_id = p_city_id)
    and (p_type is null or p.type = p_type)
    and (p_species is null or p.species = p_species)
    and (p_event_from is null or p.event_date >= p_event_from)
    and (p_event_to is null or p.event_date <= p_event_to)
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

-- SECURITY DEFINER functions get EXECUTE to PUBLIC by default — lock it down.
revoke execute on function public.posts_nearby(
  double precision, double precision, double precision, uuid,
  public.post_type, public.species, integer,
  double precision, uuid, date, date
) from public;

grant execute on function public.posts_nearby(
  double precision, double precision, double precision, uuid,
  public.post_type, public.species, integer,
  double precision, uuid, date, date
) to anon, authenticated;

-- ─── 2. post_media SELECT policy: explicit parent-post visibility check ──────

drop policy "media of visible posts is readable, owners see all of theirs"
  on public.post_media;

create policy "media of visible posts is readable, owners see all of theirs"
  on public.post_media for select
  using (
    (
      moderation_status = 'approved'
      and exists (
        select 1 from public.posts p
        where p.id = post_media.post_id
          and p.status in ('activo', 'resuelto')
          and exists (
            select 1 from public.cities c
            where c.id = p.city_id and c.is_active
          )
      )
    )
    or exists (
      select 1 from public.posts p
      where p.id = post_media.post_id
        and p.user_id = (select auth.uid())
    )
  );
