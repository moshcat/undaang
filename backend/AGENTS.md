# undaang backend

RESTful API for undaang (digital wedding invitations). Hono on Bun, MongoDB through Mongoose, zod schemas that double as the OpenAPI document. Spec: `Dokumen SRS SDS - undaang.pdf` (FR-001 to FR-010).

## Commands

- `bun test`: unit and integration tests against an in-memory MongoDB replica set
- `bun run typecheck`: TypeScript 7 (`@typescript/native`)
- `bun run lint` / `bun run format`
- `bun run dev`: needs a filled `.env` (Atlas URI, JWT secret)
- `bun run seed`: creates the admin from `SEED_ADMIN_*` and the starter themes

Run every command from `backend/`. `bunfig.toml` preloads `src/shims/bun-v8.ts`; without it bson crashes on import under Bun 1.3.

## Layout

- `src/app.ts`: `createApp()` wires middleware and routers. `src/index.ts` connects the database and serves.
- `src/routes/`: one `OpenAPIHono` router per module, built with `createRouter()` from `src/lib/router.ts` so validation errors share one format.
- `src/services/`: plan gating, DOKU, R2, stats. Handlers stay thin.
- `src/config/plans.ts`: prices and quotas. Order amounts always come from here, never from the request.
- `src/models/`: Mongoose schemas with the indexes from SDS 3.2.

## Conventions

- Success body `{ data, meta? }`, error body `{ error: { code, message, details? } }`. Throw helpers from `src/lib/errors.ts`; `src/middlewares/error.ts` turns them into responses.
- Plan limits are enforced in the backend and answer `402`.
- Secrets live only in `.env`. Never print or commit their values.
- Commits: atomic, Conventional Commits, no trailers.

## Verifying changes

Hono CLI cannot load this app: it bundles the app for Node and mongodb's dynamic `require` fails there. Verify with `bun test`, which drives the same `app.request()` in-process. Add or extend a test in `tests/` instead of starting a dev server.

<!-- hono-cli:start -->
## Hono CLI

- Verify changes with Hono CLI instead of a browser or curl: `npx hono request <path>`, `npx hono batch -` for flows. Run `npx hono --help` first.
<!-- hono-cli:end -->
