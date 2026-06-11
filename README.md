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
| Backend | Supabase (Auth, Postgres + PostGIS, Storage, Edge Functions) — lands in F0.2 |
| Server state | TanStack React Query (planned) |
| Local state | Zustand (planned) |
| Lint/format | ESLint (flat config, `eslint-config-expo`) + Prettier |
| Tests | Jest (`jest-expo` preset) + @testing-library/react-native 14 |

## Getting started

Requirements: Node 20+, npm, and the [Expo Go](https://expo.dev/go) app or an
iOS Simulator / Android Emulator.

```bash
git clone <repo-url> huellitas
cd huellitas
npm install
npx expo start
```

Then press `i` (iOS Simulator), `a` (Android Emulator) or scan the QR code with
Expo Go.

> Supabase local setup (CLI, migrations, seed) arrives with task F0.2 and will
> be documented here once it exists.

## Scripts

| Command | What it does |
| --- | --- |
| `npx expo start` | Start the dev server (also `npm run ios` / `android` / `web`) |
| `npm run typecheck` | `tsc --noEmit` against strict TypeScript |
| `npm run lint` | ESLint over the whole project |
| `npm test` | Jest test suite |

All three checks (`typecheck`, `lint`, `test`) must pass before a task is
considered done.

## Project structure

```
app/                  # expo-router routes (presentation only)
src/
  components/         # shared UI components
  features/           # one folder per feature: {domain,data,hooks,components}
  theme/              # semantic design tokens, light/dark
  lib/                # supabase client, helpers (database.types.ts lives here)
__tests__/            # Jest tests, mirrors source layout (e.g. __tests__/app/)
docs/                 # BACKLOG.md today; ARCHITECTURE.md, ADRs, API docs later
supabase/             # migrations & seed — coming in F0.2
```

`src/components`, `src/features`, `src/theme` and `src/lib` are empty skeletons
right now; they fill up as features land.

Path alias: `@/*` resolves to `src/*` (see `tsconfig.json`).

### Layering rules (short version)

Dependencies always point inward: UI → hooks → repositories → domain.
Components never call Supabase directly; repositories return domain types, not
raw DB rows. Full rules live in `CLAUDE.md` ("Principios de ingeniería").

## Testing

- Runner: Jest with the `jest-expo` preset; tests match
  `**/__tests__/**/*.test.ts(x)`.
- Component tests use `@testing-library/react-native` **v14**.

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
- `docs/SPRINTS.md`, `docs/ARCHITECTURE.md`, `docs/API.md`,
  `docs/decisions/` (ADRs) — created as the relevant work lands.

## Roadmap (very short)

Next up: Supabase local environment + schema (F0.2), theming tokens with
light/dark support, CityProvider for multi-city scoping, then the core
lost/found/sighted post flow. Track progress in `docs/BACKLOG.md`.
