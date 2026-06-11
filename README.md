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
| Server state | TanStack React Query (planned) |
| Local state | Zustand (planned) |
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

## Project structure

```
app/                  # expo-router routes (presentation only)
src/
  components/         # shared UI components
  features/           # one folder per feature: {domain,data,hooks,components}
  theme/              # semantic design tokens, light/dark
  lib/
    supabase.ts       # typed singleton client (throws if env vars are missing)
    database.types.ts # generated via `supabase gen types` — data layer only
__tests__/            # Jest tests, mirrors source layout (e.g. __tests__/app/)
docs/                 # BACKLOG.md, ARCHITECTURE.md, decisions/ (ADRs)
supabase/             # config.toml, migrations/, seed.sql
```

`src/components`, `src/features` and `src/theme` are empty skeletons right now;
they fill up as features land.

Path alias: `@/*` resolves to `src/*` (see `tsconfig.json`).

Notes on `src/lib/`: the Supabase client does not persist sessions yet
(`persistSession: false` — Sprint 2 adds auth with secure storage), and
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

## Documentation

- `CLAUDE.md` — project context, product rules and engineering principles.
- `PLAN.md` — overall plan; `docs/BACKLOG.md` — per-task status.
- `docs/ARCHITECTURE.md` — high-level architecture, data model and security
  invariants; `docs/decisions/` — ADRs recording key technical decisions.
- `docs/SPRINTS.md`, `docs/API.md` — created as the relevant work lands.

## Roadmap (very short)

Done: project scaffold (F0.1), local Supabase environment + typed client
(F0.2). Next up: database schema with PostGIS, theming tokens with light/dark
support, CityProvider for multi-city scoping, then the core lost/found/sighted
post flow. Track progress in `docs/BACKLOG.md`.
