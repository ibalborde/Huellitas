# Huellitas 🐾

Hyperlocal social network for **lost, found and sighted pets**. People post a pet
with a photo and a map location; neighbors nearby help reunite them.

- First city: **Rosario (Santa Fe, Argentina)** — but the architecture is
  multi-city from day one (no logic may assume Rosario).
- Browsing never requires an account; posting does.
- UI language is Rioplatense Spanish (es-AR). Code, commits and technical docs
  are in English.
- Light/dark theming is mandatory: components consume semantic tokens from
  `src/theme/`, never hardcoded hex colors.

## Stack

| Layer | Tech |
| --- | --- |
| App | React Native 0.85 + Expo SDK 56 (managed), React 19.2, TypeScript (strict) |
| Navigation | expo-router (file-based, entry: `expo-router/entry`) |
| Backend | Supabase (Auth, Postgres + PostGIS, Storage, Edge Functions), local-first via Supabase CLI |
| Server state | TanStack React Query v5 (client in `src/lib/queryClient.ts`) |
| Local state | Zustand (installed; first real use lands with the S1.3 UI state) |
| Lint/format | ESLint (flat config, `eslint-config-expo`) + Prettier |
| Tests | Jest (`jest-expo` preset) + @testing-library/react-native 14 |

## Getting started

### Prerequisites

- Node 20+ and npm.
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (running) —
  the local Supabase stack is a set of containers.
- [Supabase CLI](https://supabase.com/docs/guides/local-development) v2.105+:
  `brew install supabase/tap/supabase`.
- The [Expo Go](https://expo.dev/go) app, or an iOS Simulator / Android Emulator.

### Setup

```bash
git clone <repo-url> huellitas
cd huellitas
npm install

# 1. Start the local Supabase stack (project id: "huellitas", supabase/config.toml)
supabase start

# 2. Configure the app's environment
cp .env.example .env
supabase status   # copy "API URL" and the anon key into .env

# 3. Run the app
npx expo start    # then press i / a, or scan the QR with Expo Go
```

`.env` is gitignored and holds `EXPO_PUBLIC_SUPABASE_URL` and
`EXPO_PUBLIC_SUPABASE_ANON_KEY`; `.env.example` documents both. Supabase CLI
2.x labels the anon key **"Publishable key"** in `supabase status` — that's
the value you want.

> **Security:** NEVER put the `service_role` / `sb_secret_*` key in an
> `EXPO_PUBLIC_*` variable (those are bundled into the app and therefore
> public) or in any committed file.

## Scripts

| Command | What it does |
| --- | --- |
| `npx expo start` | Start the dev server (also `npm run ios` / `android` / `web`) |
| `npm run typecheck` | `tsc --noEmit` against strict TypeScript |
| `npm run lint` | ESLint over the whole project |
| `npm test` | Jest unit test suite |
| `npm run test:integration` | Integration tests against local Supabase (requires `supabase start`) |
| `supabase start` / `supabase stop` | Start / stop the local Supabase containers |
| `supabase status` | Show local URLs and keys (source for `.env` values) |
| `supabase gen types typescript --local > src/lib/database.types.ts` | Regenerate DB types — run after **every** migration |

All three checks (`typecheck`, `lint`, `test`) must pass before a task is
considered done.

CI: a GitHub Actions workflow (`.github/workflows/ci.yml`) runs typecheck,
lint and unit tests on every push to `main` and on PRs, plus the integration
suite on PRs only. Status badge pending the first push to a GitHub remote.

## Project structure

```
app/                  # expo-router routes (presentation only); _layout.tsx
                      # mounts ThemeProvider > QueryClientProvider > CityProvider
src/
  components/         # shared UI: Button, Badge, Card, Input, EmptyState
  features/           # one folder per feature: {domain,data,hooks,components},
                      # public API via index.ts
    cities/           # City domain type, repository (+ EWKB point decoder),
                      # useActiveCities, CityProvider/useActiveCity
    posts/            # Post domain types, posts repository (keyset pagination),
                      # usePostsNearby (infinite nearby feed)
  theme/              # semantic tokens (colors/spacing/radii/typography),
                      # ThemeProvider, useTheme/useThemedStyles, MIN_TOUCH_TARGET
  lib/
    supabase.ts       # lazy typed client: getSupabaseClient() creates it on
                      # first call (throws there if env vars are missing)
    queryClient.ts    # React Query client factory (staleTime 60s, retry 1)
    errors.ts         # DataError: technical message + es-AR userMessage
    geo.ts            # Coordinates type + rounding helpers (pure, any layer)
    database.types.ts # generated via `supabase gen types` — data layer only
__tests__/            # Jest tests, mirrors source layout (e.g. __tests__/app/)
docs/                 # BACKLOG.md, ARCHITECTURE.md, decisions/ (ADRs)
supabase/             # config.toml, migrations/, seed.sql
```

`src/theme/colors.ts` is the **only** file in `src/` allowed to contain hex
colors — everything else consumes semantic tokens via `useTheme()` /
`useThemedStyles()` (see `docs/ARCHITECTURE.md`, "Theming").

Path alias: `@/*` resolves to `src/*` (see `tsconfig.json`).

Notes on `src/lib/`: the Supabase client is created lazily by
`getSupabaseClient()` so data-layer modules stay importable without env
configuration (a misconfig surfaces on the first backend call, inside React
Query's error handling); it does not persist sessions yet
(`persistSession: false` — Sprint 2 adds auth with secure storage); and
`database.types.ts` may only be imported from the data layer
(`src/features/*/data/`), never from hooks or components.

### Layering rules (short version)

Dependencies always point inward: UI → hooks → repositories → domain.
Components never call Supabase directly; repositories return domain types, not
raw DB rows. Full rules live in `CLAUDE.md` ("Principios de ingeniería").

## Testing

Two suites:

- **Unit** (`npm test`): Jest with the `jest-expo` preset; tests match
  `**/__tests__/**/*.test.ts(x)`, excluding `__tests__/integration/`.
  Component tests use `@testing-library/react-native` **v14**.
- **Integration** (`npm run test:integration`): runs
  `__tests__/integration/` via `jest.integration.config.js` against the
  **local Supabase stack** — `supabase start` must be running. These tests
  assert the database security boundaries (RLS, column grants, RPC clamps).

### Gotcha: `render()` is async in RNTL 14

`render()` returns a promise and must be awaited, and the test callback must be
`async`:

```tsx
it('shows the title', async () => {
  await render(<HomeScreen />);
  expect(screen.getByRole('header')).toHaveTextContent('Huellitas');
});
```

Forgetting the `await` produces confusing "element not found" failures. See
`__tests__/app/index.test.tsx` for a working example.

### Gotcha: forcing light/dark mode in tests

Spying on `Appearance.getColorScheme` does **not** work under the `jest-expo`
preset: it replaces the entire `useColorScheme` module with a mock, so the
real `Appearance` module is never consulted. Use the helper instead:

```tsx
import { renderWithTheme, mockSystemColorScheme, THEME_MODES } from '../helpers/theme-testing';

it.each(THEME_MODES)('renders in %s mode', async (mode) => {
  await renderWithTheme(<Badge label="Perdido" variant="lost" />, mode);
  // ...
});
```

`mockSystemColorScheme(scheme)` sets the preset's mock directly (and
`renderWithTheme` calls it for you). The mocked scheme persists for the rest
of the test file, so set it explicitly in every test that depends on the mode.
Details in `__tests__/src/helpers/theme-testing.tsx`.

## Documentation

- `CLAUDE.md` — project context, product rules and engineering principles.
- `PLAN.md` — overall plan; `docs/BACKLOG.md` — per-task status.
- `docs/ARCHITECTURE.md` — high-level architecture, data model and security
  invariants; `docs/decisions/` — ADRs recording key technical decisions.
- `docs/SPRINTS.md` — per-sprint changelog; `docs/API.md` — created as the
  relevant work lands.

## Roadmap (very short)

Done (Fase 0): project scaffold (F0.1), local Supabase environment + typed
client (F0.2), database schema with PostGIS (F0.3), theming tokens with
light/dark support + base UI components (F0.4), CI pipeline (F0.5).
In progress (Sprint 1): keyset pagination for `posts_nearby` (S1.1) and the
cities/posts client data layer with `CityProvider` and `usePostsNearby`
(S1.2) are done; next up is the home screen with map/list toggle and filters.
Track progress in `docs/BACKLOG.md`.
