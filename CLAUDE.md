<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md — rules of this codebase

A Next.js 16 (App Router) app with three non-hierarchical roles, an in-memory store, and a permission model **enforced on the server**. The permission rules are the product: treat any change that touches them as a security change.

## Commands

```bash
npm install
npm run dev        # http://localhost:3000. Data is re-seeded on every server start.
npm test           # vitest unit tests for src/server/auth/policy.ts
npm run typecheck  # tsc --noEmit (strict, noUncheckedIndexedAccess; also covers test/)
npm run lint       # eslint. The import boundaries below are lint ERRORS.
npm run check      # typecheck + lint + test. Run before every commit.
npm run build      # every route except /_not-found must stay ƒ (dynamic)
```

All seeded accounts use the password `password123` (see README).

## Where things live, and what may import what

```
src/types/Roles.ts  THE ONE PLACE ROLES ARE DEFINED (rule 6): Role, RoleDefinition,
                    ROLE_DEFINITIONS (the capability matrix), ROLES.
src/lib/roles.ts    Helpers that read the matrix (getRoleDefinition, isAdministratorRole).
                    Role-agnostic: never edited when adding a role.
src/types/          Everything else here is types only: Models (User, Client, Credential),
                    Api (wire DTOs shared with the client), Policy, Session, Store.
src/data/           'server-only'. store.ts (one object on globalThis), seed.ts,
                    client-generator.ts.
src/server/         'server-only'.
  auth/policy.ts    ← THE ONLY PLACE PERMISSION DECISIONS ARE MADE
  auth/session.ts     opaque-token sessions; resolveSession() re-reads the user every request
  auth/guards.ts      request → active actor (401 / redirect / forbidden()); no rules of its own
  services/*.ts       use-cases: call policy → validate against current data → write
  http/*.ts           zod schemas (shape only) + JSON response helpers
  result.ts           Result<T> / AppError returned by services
src/app/            Routes. Thin: authenticate → parse → call a service → respond.
  (main)/           Logged-in pages and their layout (the navbar). Groups don't change URLs.
src/client/api.ts   The browser's only way to call the server (fetch wrapper, 401 → /login).
src/components/     'use client' UI.
test/               vitest. policy.test.ts covers rules 2–4.
```

Enforced by `eslint.config.mjs`:
- `src/components/**` and `src/client/**` must not import `@/server/*`, `@/data/*` or `server-only`. They may import `@/types/Roles` and `@/lib/roles` **only with `import type`**.
- `src/types/**` and `src/lib/**` must not import Next, React, the store, server code or UI.
- `src/server/**` and `src/data/**` must not import `@/app/*`, `@/components/*` or `@/client/*`.

Every file in `src/server/` and `src/data/` starts with `import "server-only";`, so a client import fails the build too, not just lint.

## Non-negotiable constraints

1. **Every permission check runs on the server, inside the service, before the write.** Route handlers and pages don't check rules themselves; they call a service, and the service calls `policy.ts`. Hiding a button is not enforcement: assume the API is called directly.
2. **Never trust the client.** The UI renders the `allowed` flags and `meta` (role options, manager options) produced by `listManagedUsers()`. The `/manage-users` page renders it server-side, and `GET /api/users` returns the same data. Don't re-derive permissions in a component, and don't add a client-side role check "for UX".
3. **No role strings inline.** Don't write `role === "IT"`, `case "manager":` or `Role.IT` outside `src/types/Roles.ts` and `src/data/seed.ts`. Ask a capability instead (`canViewContent(actor)`, `getRoleDefinition(role).can.x`).
4. **The client list is always paginated server-side.** `GET /api/clients` returns one page plus `total`; `limit` is capped at 100 in `server/http/schemas.ts`. Don't add an endpoint, server action or page prop that returns the full array, even "just for export".
5. **Auth state is never cached.** Every request goes through `resolveSession()`, which reads the user's current `status` and `role` from the store. Keep `cacheComponents: false`. Don't add `"use cache"` / `"use cache: private"` to anything that reads the session. Don't put the role or status in the cookie.
6. **One PATCH endpoint for user edits** (`/api/users/[id]`). Don't add side doors like `/deactivate` or `/promote`: every change must pass through `authorizeUserUpdate()`.
7. **No `any` and no `@ts-ignore`** in `src/server`, `src/data`, `src/types` or `src/lib`. If a cast is truly needed, add a comment saying why.

## Adding a fourth role (worked example)

Edit **`src/types/Roles.ts`** only:
1. Add a key to `Role`, e.g. `Auditor: "auditor"`.
2. Add `ROLE_DEFINITIONS[Role.Auditor]`. TypeScript won't compile until every field is set: `label`, `landingPath`, `canHaveReports`, and the capabilities `viewUsers`, `createUser`, `editProfile`, `changeRole`, `changeStatus`, `assignManager`, `viewContent`.
3. Optionally seed an account in `src/data/seed.ts`, and add cases to `test/policy.test.ts`.

Nothing else should need editing: zod validation (`z.enum(Role)`), role dropdowns (`meta.roleOptions`), nav links, landing redirects and policy all derive from that file. **If you find yourself editing `policy.ts` to add a role, stop.** Either a capability is missing from `RoleDefinition` (add the capability, then use it in policy), or you're about to write an inline role check.

Scopes are `"all"`, `"directReports"` (`target.managerId === actor.id`, never the actor themself) or `"none"`. A new kind of scope goes into the `Scope` union and `isInScope()` in policy.ts; the `switch` is exhaustive, so TypeScript points you there.

## Counter-intuitive things you'll get wrong on first contact

- **Roles aren't a hierarchy.** IT is *refused* on `/content/*` and `/api/clients` (403). That's intended. Don't "fix" it by making IT a superset of manager.
- **"Last IT" means last *administrator*.** Rule 4 counts active accounts whose role has both `changeRole` and `changeStatus` (`isAdministratorRole()`). Today that's exactly IT; a new role with those powers counts automatically.
- **The order of denials is deliberate.** `authorizeUserUpdate()` returns `LAST_ADMINISTRATOR` before `SELF_LOCKOUT`, so the last IT deactivating themselves gets a *different* primary reason from their first attempt (brief, scenario 11). Both are returned in `details`.
- **Any change to your own role counts as a "demotion".** Roles have no ranking, so nobody may change their own role or deactivate themselves. IT *may* edit their own name and email.
- **Managers get 404, not 403, for users outside their team** (no probing which ids exist). Their own record and the fields they can't change on reports get 403.
- **Unchanged fields aren't permission-checked.** A manager PATCHing `{ fullName, role: <same role> }` succeeds; only real changes need the capability.
- **No `proxy.ts` (formerly middleware) for auth, on purpose.** It may run outside the main runtime, so it can't see the in-memory session table or the user's current status. Pages gate themselves with `requirePageActor(policyFn)`.
- **The store lives on `globalThis`** (`src/data/store.ts`) because route handlers and pages are separate bundles; a module-level `const` can fork into two stores.
- **Rule 4 is safe without locks only because check-and-write are synchronous** in `updateUser()`. Never add an `await` between `authorizeUserUpdate()` and the store write. With a real DB, wrap both in a transaction.
- **403 pages use `forbidden()`** (needs `experimental.authInterrupts`, already on). Never redirect a logged-in user who lacks access; that's how redirect loops start. Don't call `forbidden()` in the root layout.
- **The navbar lives in `src/app/(main)/layout.tsx`, not the root layout.** Layouts persist across client navigations, so a root-layout nav keeps showing a deactivated user's links after they're redirected to `/login`. Leaving the `(main)` group unmounts it. New logged-in pages go inside `(main)/`.
- **Org-chart rules live in `services/users.ts`, not policy.** A manager must have a role with `canHaveReports`; reporting cycles are rejected; a manager's role can't change while they still have reports. Deactivating a manager does *not* orphan their reports (Kateryna, whose manager Taras is deactivated, can still log in).
- **Client data is deterministic** (seeded PRNG): `cl-0001` is the same client after every restart.
- **`window.location.assign("/login")` in `src/client/api.ts` is intentional.** A hard reload on 401 drops the old session's client state. The login form passes `{ redirectOnUnauthenticated: false }`, because there a 401 means "wrong credentials".
