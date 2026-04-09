# AGENTS.md

## Project structure

Two-package monorepo: `backend/` (Express + SQLite) and `frontend/` (React + Vite). **Not** an npm/pnpm workspace — the root `package.json` orchestrates via `cd` and `concurrently`. Always use the root scripts or `npm -C <dir>` rather than `cd`-ing manually.

Both packages are ESM (`"type": "module"`) and use the `@/` path alias → `./src/*`.

## Commands

```bash
npm run install:all          # Install root + backend + frontend (not just `npm install`)
npm run dev                  # Start both servers concurrently (frontend :5173, backend :3001)
npm run build                # Build backend (tsc) then frontend (tsc && vite build)

# Testing (Vitest)
npm test                     # Frontend then backend, sequentially
npm run test:all             # Both in parallel
npm run test:watch           # Both in watch mode
npm -C frontend run test:run # Frontend only
npm -C backend run test:run  # Backend only

# Lint (frontend only — no root lint or typecheck script)
npm -C frontend run lint

# Database
npm run db:setup             # Push schema + seed (interactive — prompts for admin email)
npm -C backend run db:push   # Push schema changes without seeding
npm -C backend run db:studio # Open Drizzle Studio GUI
```

## Database (Drizzle + SQLite)

- Schema source of truth: `backend/src/db/schema.ts`
- Dev workflow uses `db:push` (direct schema push), not migration files
- DB file: `backend/data/ovos-sprint.db` (gitignored)
- `db:seed` is **interactive** — it prompts for an admin email and prints a generated password. For non-interactive seeding, set `ADMIN_EMAIL` and `ADMIN_PASSWORD` env vars (see `backend/.env.example`)

## Testing

- **Backend**: `globals: true` (describe/it/expect are global), `environment: 'node'`, runs serially (`fileParallelism: false`)
  - Uses a separate test DB at `data/test-ovos-sprint.db`. The setup file (`backend/src/tests/setup.ts`) **throws** if `DATABASE_URL` doesn't contain "test" — never point tests at the real DB.
  - Uses `supertest` for HTTP assertions.
- **Frontend**: `globals: false` — you **must** import `describe`, `it`, `expect` from `vitest` in every test file.
  - Uses `jsdom` environment with `@testing-library/react` and `@testing-library/jest-dom`.
- Test files live in `src/tests/` or `src/**/tests/` directories in both packages, using `.test.ts` / `.test.tsx` extensions.

## Backend quirks

- Strict TypeScript: `noUnusedLocals` and `noUnusedParameters` — unused variables fail the build.
- ESM imports require `.js` extensions (e.g., `import authRoutes from './routes/auth.js'`).
- `jsx: react-jsx` is enabled because the backend renders React Email templates server-side (`backend/src/services/email/templates/`).
- Backend loads `.env` from `backend/.env` via `dotenv`. See `backend/.env.example` for all config options.
- The backend validates required env vars on startup and **exits** in production if `JWT_SECRET`, `FRONTEND_URL`, or `BACKEND_URL` are missing.

## Frontend quirks

- shadcn/ui components in `frontend/src/components/ui/` are manually managed (no `components.json`). Copy or create components by hand following the existing pattern.
- Vite proxies `/api` to `http://localhost:3000` (Caddy port in Docker). Without Docker, the frontend connects via `VITE_API_URL` which defaults to `http://localhost:3001` in `frontend/src/api/client.ts`.
- All frontend env vars must be prefixed with `VITE_`.

## Git workflow

- **`next`** is the development branch — do daily work here.
- **`main`** is production (deployed to https://sprint.ovos.at). Only merge `next` → `main` for releases.
- Feature branches: `feature/*`, fix branches: `fix/*` — merge back to `next`, then delete.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `chore:`, `docs:`, etc.

## CI

No test/lint/build pipeline in CI. The two GitHub Actions workflows (`.github/workflows/`) are:
- `claude-code-review.yml` — automated Claude code review on PRs
- `claude.yml` — interactive `@claude` mentions in issues/PRs

## Further reading

- `ARCHITECTURE.md` — API endpoints, database schema, directory tree, data flows
- `DEVELOPMENT_SETUP.md` — Docker Compose setup, Mailpit email testing, env config
- `BRANCHING_STRATEGY.md` — full git workflow and release process
