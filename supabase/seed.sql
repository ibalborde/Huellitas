-- =============================================================================
-- Seed data — local development & first deploy.
--
-- Rosario is DATA, not code: it is the launch city, nothing in the schema or
-- app logic depends on it. Adding a city = inserting rows like these.
-- Coordinates are approximate (lng lat order in WKT). No fake users/posts:
-- posts require real auth.users rows, which are created through the app.
-- =============================================================================

insert into public.cities (name, slug, country_code, center, bounds, timezone, is_active)
values (
  'Rosario',
  'rosario',
  'AR',
  extensions.st_point(-60.6393, -32.9468)::extensions.geography,
  -- Approximate bounding polygon of the Rosario municipality. Good enough for
  -- city resolution (assign_post_city / resolve_city); refine later if needed.
  extensions.st_geogfromtext(
    'SRID=4326;POLYGON((
      -60.7900 -32.8500,
      -60.6000 -32.8500,
      -60.6000 -33.0300,
      -60.7900 -33.0300,
      -60.7900 -32.8500
    ))'
  ),
  'America/Argentina/Cordoba',
  true
);

-- ~15 well-known Rosario neighborhoods with approximate centers.
insert into public.neighborhoods (city_id, name, center)
select c.id, n.name, extensions.st_point(n.lng, n.lat)::extensions.geography
from public.cities c
cross join (
  values
    ('Centro',                -60.6393, -32.9468),
    ('Pichincha',             -60.6529, -32.9352),
    ('Echesortu',             -60.6680, -32.9410),
    ('Abasto',                -60.6440, -32.9610),
    ('República de la Sexta', -60.6320, -32.9660),
    ('Martin',                -60.6310, -32.9560),
    ('Alberdi',               -60.6740, -32.9060),
    ('Arroyito',              -60.6790, -32.9140),
    ('La Florida',            -60.7000, -32.8850),
    ('Fisherton',             -60.7410, -32.9230),
    ('Belgrano',              -60.7180, -32.9420),
    ('Empalme Graneros',      -60.6960, -32.9210),
    ('Ludueña',               -60.6890, -32.9300),
    ('Tiro Suizo',            -60.6390, -32.9890),
    ('Saladillo',             -60.6300, -33.0080)
) as n(name, lng, lat)
where c.slug = 'rosario';
