-- =============================================================================
-- Huellitas — initial schema (multi-city)
--
-- Guiding principles:
--   * Nothing here assumes Rosario. Cities are data, not code (seed.sql only).
--   * Every geography column gets a GiST index.
--   * city_id is always derivable from the post location (trigger below).
--   * RLS on every table. Viewing public content never requires an account;
--     writing always does.
--   * post_media supports video and a moderation pipeline from day one even
--     though the MVP only uses photos: cheap decision today, expensive
--     migration tomorrow.
-- =============================================================================

-- PostGIS lives in the `extensions` schema (Supabase convention). The API
-- search_path already includes `extensions`, so geography types resolve.
create extension if not exists postgis with schema extensions;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------

create type public.post_type as enum ('perdido', 'encontrado', 'avistado');
create type public.post_status as enum ('activo', 'resuelto', 'archivado');
create type public.species as enum ('gato', 'perro', 'otro');
create type public.media_type as enum ('photo', 'video');
create type public.media_status as enum ('pending', 'approved', 'rejected');

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

create table public.cities (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,
  country_code  text not null check (char_length(country_code) = 2),
  center        extensions.geography(point, 4326) not null,
  -- City limits used to derive posts.city_id (see assign_post_city trigger)
  -- and by resolve_city(). Approximate polygons are fine.
  bounds        extensions.geography(polygon, 4326) not null,
  timezone      text not null,
  is_active     boolean not null default false,
  created_at    timestamptz not null default now()
);

create table public.neighborhoods (
  id       uuid primary key default gen_random_uuid(),
  city_id  uuid not null references public.cities (id) on delete cascade,
  name     text not null,
  center   extensions.geography(point, 4326) not null,
  unique (city_id, name)
);

-- One row per auth user, auto-created by handle_new_user(). `whatsapp` is the
-- primary contact channel and is restricted to authenticated readers via
-- COLUMN-LEVEL GRANTS (see "Privileges" section): RLS alone cannot hide a
-- single column, and a separate public view would duplicate the table for one
-- field. Column grants are the simplest mechanism that is enforced by
-- Postgres itself for every PostgREST query shape.
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text not null check (char_length(display_name) between 1 and 50),
  -- Loose E.164-ish shape; strict normalization happens client-side. The check
  -- exists so the DB never stores free-form text in a field used for wa.me links.
  whatsapp      text check (whatsapp is null or whatsapp ~ '^\+?[0-9]{8,15}$'),
  avatar_url    text,
  home_city_id  uuid references public.cities (id) on delete set null,
  created_at    timestamptz not null default now()
);

create table public.posts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  -- NOT NULL but clients may omit it: assign_post_city() derives it from
  -- `location` before insert. Every geo query must be scoped by city_id.
  city_id         uuid not null references public.cities (id),
  type            public.post_type not null,
  status          public.post_status not null default 'activo',
  species         public.species not null,
  title           text not null check (char_length(title) between 3 and 120),
  description     text not null default '' check (char_length(description) <= 2000),
  location        extensions.geography(point, 4326) not null,
  neighborhood_id uuid references public.neighborhoods (id) on delete set null,
  -- Day the pet was lost/found/seen (not the publication date).
  event_date      date not null default (now()::date),
  -- True when the reporter physically has the animal ("encontrado" flows).
  has_custody     boolean not null default false,
  created_at      timestamptz not null default now()
);

create table public.post_media (
  id                uuid primary key default gen_random_uuid(),
  post_id           uuid not null references public.posts (id) on delete cascade,
  media_type        public.media_type not null default 'photo',
  storage_path      text not null,
  thumbnail_path    text,
  position          smallint not null default 0 check (position >= 0),
  -- Default stays 'pending' on purpose: the moderation pipeline is part of
  -- the data contract. The MVP auto-approves via trigger (see
  -- mvp_auto_approve_media); Fase 2 activates AI moderation by dropping that
  -- trigger — no data migration, no default change.
  moderation_status public.media_status not null default 'pending',
  moderation_reason text,
  created_at        timestamptz not null default now(),
  unique (post_id, position)
);

create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 2000),
  -- Optional sighting location attached to the comment.
  location   extensions.geography(point, 4326),
  created_at timestamptz not null default now()
);

-- Push subscriptions for "alert me about pets near X". push_token is
-- sensitive: the whole table is owner-only (RLS + no anon grants).
create table public.zone_alerts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  city_id    uuid not null references public.cities (id) on delete cascade,
  center     extensions.geography(point, 4326) not null,
  radius_m   integer not null check (radius_m between 100 and 50000),
  -- NULL means "any species".
  species    public.species,
  push_token text not null,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------

-- GiST on every geography column.
create index cities_center_gist on public.cities using gist (center);
create index cities_bounds_gist on public.cities using gist (bounds);
create index neighborhoods_center_gist on public.neighborhoods using gist (center);
create index posts_location_gist on public.posts using gist (location);
create index comments_location_gist on public.comments using gist (location);
create index zone_alerts_center_gist on public.zone_alerts using gist (center);

-- Feed query path: posts of a city, by status, newest first. KEPT alongside
-- the partial index below because it serves explicit single-status scans
-- where status arrives as a plain query parameter (owner dashboards,
-- "resueltos" listings, service_role jobs) — those can use the index
-- condition directly.
create index posts_city_status_created_idx
  on public.posts (city_id, status, created_at desc);

-- Public feed under RLS: the policy predicate `status in ('activo',
-- 'resuelto')` relies on enum_eq, which is NOT leakproof, so for anon/
-- authenticated readers the planner cannot push it into the composite index
-- above and the feed degrades to a seq scan. This partial index bakes the
-- public-visibility statuses into the index predicate instead.
--
-- DATA-LAYER CONTRACT: feed queries must include the explicit filter
-- `status in ('activo','resuelto')` (PostgREST: status=in.(activo,resuelto)).
-- The RLS policy alone cannot prove the index predicate (its owner OR-branch
-- admits archived rows); the explicit query filter is what makes the planner
-- pick this index. Verified: 1.9ms (index) vs 18.5ms (seq scan) @50k posts.
create index posts_city_created_public_idx
  on public.posts (city_id, created_at desc)
  where status in ('activo', 'resuelto');
create index posts_user_idx on public.posts (user_id);
create index posts_neighborhood_idx on public.posts (neighborhood_id);

-- Media for a post filtered by moderation status (feeds only show approved).
create index post_media_post_status_idx
  on public.post_media (post_id, moderation_status);

create index comments_post_created_idx on public.comments (post_id, created_at);
create index comments_user_idx on public.comments (user_id);
create index neighborhoods_city_idx on public.neighborhoods (city_id);
create index zone_alerts_user_idx on public.zone_alerts (user_id);
create index zone_alerts_city_idx on public.zone_alerts (city_id);
create index profiles_home_city_idx on public.profiles (home_city_id);

-- -----------------------------------------------------------------------------
-- Functions & triggers
-- -----------------------------------------------------------------------------

-- Auto-create a profile when an auth user signs up. SECURITY DEFINER is
-- required: the insert is performed by supabase_auth_admin, which has no
-- privileges on public.profiles.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- NEVER derive the name from the email: profiles are world-readable, so an
  -- email-local-part default would leak email fragments publicly. Missing or
  -- empty metadata falls back to a neutral placeholder. left(..., 50) keeps
  -- the value inside the display_name length check.
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(left(trim(new.raw_user_meta_data ->> 'display_name'), 50), ''),
      'Usuario'
    )
  );
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Derive posts.city_id from the location. ALWAYS overrides any client-provided
-- value (a client must never be able to claim a different city for a post —
-- city_id is purely a function of location). Fires on insert and whenever the
-- location changes; direct city_id updates are blocked by the column-scoped
-- UPDATE grant on posts (see Privileges).
-- ST_Covers instead of ST_Contains because ST_Contains has no geography
-- overload; semantics are equivalent for point-in-polygon.
-- SECURITY INVOKER on purpose: cities are world-readable, no escalation needed.
create function public.assign_post_city()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
begin
  select c.id into new.city_id
  from public.cities c
  where c.is_active
    and extensions.st_covers(c.bounds, new.location)
  limit 1;

  if new.city_id is null then
    raise exception 'post location is not inside any active city'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger posts_assign_city
  before insert or update of location on public.posts
  for each row execute function public.assign_post_city();

-- MVP ONLY: auto-approve every media on insert. Fase 2 (AI moderation)
-- activates by simply dropping this trigger + function — new rows then stay
-- 'pending' (the column default) until the moderation pipeline resolves them.
-- Existing rows keep their status: zero data migration.
create function public.mvp_auto_approve_media()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.moderation_status := 'approved';
  return new;
end;
$$;

create trigger post_media_mvp_auto_approve
  before insert on public.post_media
  for each row execute function public.mvp_auto_approve_media();

-- Resolve which active city contains a coordinate (e.g. on app start, from
-- device GPS). SECURITY INVOKER: cities are public.
create function public.resolve_city(lat double precision, lng double precision)
returns setof public.cities
language sql
stable
set search_path = public, extensions
as $$
  select c.*
  from public.cities c
  where c.is_active
    and extensions.st_covers(
      c.bounds,
      extensions.st_point(lng, lat)::extensions.geography
    )
  limit 1;
$$;

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
-- callers can trigger.
create function public.posts_nearby(
  lat double precision,
  lng double precision,
  radius_m double precision default 5000,
  p_city_id uuid default null,
  p_type public.post_type default null,
  p_species public.species default null,
  p_status public.post_status default 'activo',
  p_limit integer default 100
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
  order by distance_m
  limit least(greatest(coalesce(p_limit, 100), 1), 200);
$$;

-- SECURITY DEFINER functions get EXECUTE to PUBLIC by default — lock it down
-- to the API roles explicitly.
revoke execute on function public.posts_nearby(
  double precision, double precision, double precision, uuid,
  public.post_type, public.species, public.post_status, integer
) from public;
grant execute on function public.posts_nearby(
  double precision, double precision, double precision, uuid,
  public.post_type, public.species, public.post_status, integer
) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Privileges (column-level security for profiles.whatsapp lives here)
--
-- Grants define the *maximum* surface per role; RLS then filters rows.
-- Explicit grants instead of relying on default privileges: Supabase is
-- phasing out auto-exposure of new tables, and being explicit documents
-- intent.
-- -----------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;

-- Supabase's default privileges auto-grant ALL on new tables to anon and
-- authenticated. Revoke first so the grants below are the *complete* surface
-- (otherwise the whatsapp column restriction and the private zone_alerts
-- table would be silently bypassed). service_role keeps its grants.
revoke all on table
  public.cities, public.neighborhoods, public.profiles, public.posts,
  public.post_media, public.comments, public.zone_alerts
from anon, authenticated;

-- Reference data: world-readable, never writable through the API.
grant select on public.cities, public.neighborhoods to anon, authenticated;

-- profiles: anon can NEVER read whatsapp (product rule: WhatsApp visible only
-- to authenticated users). Enforced with column-level grants — note the anon
-- grant deliberately omits `whatsapp`.
grant select (id, display_name, avatar_url, home_city_id, created_at)
  on public.profiles to anon;
grant select on public.profiles to authenticated;
-- id/created_at are immutable: update grant excludes them.
grant update (display_name, whatsapp, avatar_url, home_city_id)
  on public.profiles to authenticated;

grant select on public.posts, public.post_media, public.comments to anon;

-- posts: INSERT and UPDATE are column-scoped — id/created_at always fall to
-- their defaults (a spoofed future created_at would pin a post on top of the
-- feed) and city_id is derived from location by trigger only (clients must
-- never claim a different city directly).
grant select, delete on public.posts to authenticated;
grant insert (user_id, city_id, type, status, species, title, description,
              location, neighborhood_id, event_date, has_custody)
  on public.posts to authenticated;
grant update (type, status, species, title, description, location,
              neighborhood_id, event_date, has_custody)
  on public.posts to authenticated;

-- post_media: moderation_status / moderation_reason are NEVER client-writable
-- (column-scoped insert AND update). A table-wide grant would let an owner
-- self-approve media and bypass the moderation pipeline. Only the MVP
-- auto-approve trigger (and Fase 2's service_role pipeline) may set them.
grant select, delete on public.post_media to authenticated;
grant insert (post_id, media_type, storage_path, thumbnail_path, position)
  on public.post_media to authenticated;
grant update (thumbnail_path, position) on public.post_media to authenticated;

-- comments: post_id/user_id/created_at are immutable after insert and
-- id/created_at always fall to their defaults (column-scoped INSERT).
grant select, delete on public.comments to authenticated;
grant insert (post_id, user_id, body, location)
  on public.comments to authenticated;
grant update (body, location) on public.comments to authenticated;

-- zone_alerts hold push tokens: no anon access at all.
grant select, insert, update, delete on public.zone_alerts to authenticated;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

alter table public.cities enable row level security;
alter table public.neighborhoods enable row level security;
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.post_media enable row level security;
alter table public.comments enable row level security;
alter table public.zone_alerts enable row level security;

-- cities / neighborhoods: public reference data, writes only via migrations
-- or service_role (no insert/update/delete policies on purpose).
create policy "cities are readable by everyone"
  on public.cities for select
  using (true);

create policy "neighborhoods are readable by everyone"
  on public.neighborhoods for select
  using (true);

-- profiles: rows are visible to everyone (column grants hide whatsapp from
-- anon). Inserts happen via the handle_new_user trigger (security definer),
-- so no insert policy is needed. Owners edit their own profile.
create policy "profiles are readable by everyone"
  on public.profiles for select
  using (true);

create policy "users update own profile"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- posts: viewing never requires an account, but the public only sees
-- non-archived posts in ACTIVE cities (multi-city rule: deactivating a city
-- hides its content everywhere). 'resuelto' stays publicly visible so shared
-- links keep working and reunions remain browsable. Owners always see all of
-- their own posts.
create policy "active-city posts are readable by everyone"
  on public.posts for select
  using (
    (
      status in ('activo', 'resuelto')
      and exists (
        select 1 from public.cities c
        where c.id = posts.city_id and c.is_active
      )
    )
    or user_id = (select auth.uid())
  );

create policy "users create own posts"
  on public.posts for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "users update own posts"
  on public.posts for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "users delete own posts"
  on public.posts for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- post_media: non-approved media NEVER reaches anyone but the post owner.
-- Ownership is derived through posts (post_media has no user_id by design:
-- one owner, one source of truth). Both EXISTS subqueries run under posts'
-- own RLS — the approved branch requires the parent post to be visible to
-- the caller, so media of archived posts or inactive cities cannot be
-- enumerated via `GET /post_media` (same inheritance pattern as comments).
create policy "media of visible posts is readable, owners see all of theirs"
  on public.post_media for select
  using (
    (
      moderation_status = 'approved'
      and exists (
        select 1 from public.posts p
        where p.id = post_media.post_id
      )
    )
    or exists (
      select 1 from public.posts p
      where p.id = post_media.post_id
        and p.user_id = (select auth.uid())
    )
  );

create policy "users add media to own posts"
  on public.post_media for insert
  to authenticated
  with check (
    exists (
      select 1 from public.posts p
      where p.id = post_media.post_id
        and p.user_id = (select auth.uid())
    )
  );

create policy "users update media of own posts"
  on public.post_media for update
  to authenticated
  using (
    exists (
      select 1 from public.posts p
      where p.id = post_media.post_id
        and p.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.posts p
      where p.id = post_media.post_id
        and p.user_id = (select auth.uid())
    )
  );

create policy "users delete media of own posts"
  on public.post_media for delete
  to authenticated
  using (
    exists (
      select 1 from public.posts p
      where p.id = post_media.post_id
        and p.user_id = (select auth.uid())
    )
  );

-- comments: visible exactly when their post is visible (the EXISTS subquery
-- evaluates posts under the caller's RLS, so hidden posts hide their
-- comments too).
create policy "comments on visible posts are readable"
  on public.comments for select
  using (
    exists (select 1 from public.posts p where p.id = comments.post_id)
  );

create policy "users create own comments"
  on public.comments for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "users update own comments"
  on public.comments for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "users delete own comments"
  on public.comments for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- zone_alerts: strictly private (push tokens). Owner-only for everything.
create policy "users manage own zone alerts"
  on public.zone_alerts for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
