# Sprint log

Per-sprint changelog: what was done, what's pending, technical debt detected.
One entry per sprint, newest at the top. Task-level detail lives in
`docs/BACKLOG.md`; decisions in `docs/decisions/`.

## Fase 0 — Fundaciones (closed 2026-06)

Five tasks, five conventional commits (`7bf5a52` → `84af867`), each through
the full gate: implementation → security audit → performance review → tests
green → docs.

### What was done

- **F0.1 — Expo scaffold:** Expo managed app with strict TypeScript,
  expo-router, ESLint + Prettier, Jest + RNTL 14, and the CLAUDE.md folder
  skeleton (`app/`, `src/{components,features,theme,lib}/`, `supabase/`).
- **F0.2 — Supabase local environment:** Supabase CLI stack running on local
  Docker; typed client in `src/lib/supabase.ts` reading keys from env
  (`.env` gitignored, `.env.example` committed).
- **F0.3 — Migration 0001:** multi-city schema (cities, neighborhoods,
  profiles, posts, post_media + comments and zone_alerts), PostGIS geography
  columns with GiST indexes, RLS on every table, media moderation pipeline
  (`pending` by default, MVP auto-approve), `posts_nearby` RPC, Rosario seed.
- **F0.4 — Theming system + base components:** semantic light/dark tokens in
  `src/theme/`, ThemeProvider + `useTheme`/`useThemedStyles`, and base
  components (Button, Badge, Card, Input, EmptyState) with AA contrast and
  44pt touch targets in both modes.
- **F0.5 — CI pipeline:** GitHub Actions workflow
  (`.github/workflows/ci.yml`) running typecheck + lint + unit tests on
  pushes/PRs and the integration suite on PRs only (cost choice documented
  in the YAML); hardened with `permissions: contents: read`,
  `persist-credentials: false` and a pinned Supabase CLI.

### Review stats

- F0.3 was the only task needing a fix round: one security + one performance
  pass before approval. ADRs 001 (revoke-then-grant column-scoped
  privileges) and 002 (`posts_nearby` SECURITY DEFINER boundary) were born
  from that round; ADR 003 records the public-visibility / WhatsApp
  protection trade-off.
- At close: **81 unit + 20 integration tests green**.

### What's pending

- **F0.2b — link cloud Supabase project:** blocked on the owner's access
  token / project ref. Before going cloud, the security checklist from the
  F0.2 audit must be applied (see F0.2b in `docs/BACKLOG.md`: email
  confirmations, password policy, captcha, bucket limits, redirect
  allow-list, etc.).
- **Real CI run:** the workflow is only validated locally; first actual run
  happens on the first push to a GitHub remote.
- **Branding:** app icons/splash are still Expo defaults; Huellitas assets
  pending (dark splash variant was deferred from F0.1).

### Technical debt detected

- **Theming perf (measure at F1):** `useTheme` registers an `Appearance`
  listener per consumer, and `useThemedStyles` has no cross-instance cache.
  Not worth fixing until measured on real screens.
- **Hardening backlog from the F0.3 security audit** (tracked in
  `docs/BACKLOG.md`, not blocking): per-post contact RPC + rate limiting for
  WhatsApp exposure, storage bucket policies + `storage_path` prefix check,
  media-per-post caps, reports table, `location_precision` column.
- **Web stack leftovers:** react-native-web kept from the Expo template;
  harmless today, revisit if CI cost or bundle size becomes a concern.
