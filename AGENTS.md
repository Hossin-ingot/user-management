<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md — rules of this codebase

A Next.js 16 (App Router) app with three non-hierarchical roles, an in-memory store, and a permission model that is **enforced on the server and tested against the HTTP API**. The permission rules are the product. Treat any change that touches them as a security change.

## Commands

```bash
npm install
npm run dev        # http://localhost:3000. Data is re-seeded on every server start.
npm test           # vitest: policy unit tests + scenario tests against the real route handlers
npm run typecheck  # tsc --noEmit (strict, noUncheckedIndexedAccess; also covers test/)
npm run lint       # eslint. Import boundaries below are lint ERRORS.
npm run check      # all three. Run this before every commit.
npm run build      # every route must stay ƒ (dynamic) in the build output
```

All seeded accounts use the password `password123` (see README).

## Where things live, and what may import what

```
src/domain/       Pure types + roles.ts. No Next, no React, no store.         ← imported by everyone
src/server/       'server-only'. Store, sessions, policy, services, HTTP helpers.
  auth/policy.ts  ← THE ONLY PLACE PERMISSION DECISIONS ARE MADE
  auth/session.ts   opaque-token sessions; resolveSession() re-reads the user every request
  auth/guards.ts    request → active actor (401 / redirect / forbidden()); no rules of its own
  services/*.ts     use-cases: call policy → validate against current data → mutate
  http/*.ts         zod schemas (shape only) + JSON response helpers
src/app/          Routes. Thin: authenticate → parse → call a service → respond.
src/components/   'use client' UI. Talks to the server ONLY via fetch (components/api.ts).
src/shared/       Type-only wire DTOs shared by server and client.
test/             vitest. scenarios.test.ts mirrors the brief's walkthrough.
```

Enforced by `eslint.config.mjs`:
- `src/components/**` and `src/shared/**` must not import `@/server/*` or `server-only`, and may import `@/domain/roles` **only with `import type`**.
- `src/domain/**` must not import Next, React or server code.
- `src/server/**` must not import `@/app/*` or `@/components/*`.

## Non-negotiable constraints

1. **Every permission check runs on the server, inside the service, before the write.** Route handlers don't check rules themselves; they call a service, and the service calls `policy.ts`. Hiding a button is not enforcement. The test suite calls the API directly.
2. **Never trust the client.** The UI gets `allowed` flags and `meta` (role options, manager options) from `GET /api/users` and only renders them. Do not re-derive permissions in a component, and do not add a client-side role check "for UX".
3. **No role strings inline.** Don't write `role === "IT"`, `case "manager":`, or `Role.IT` outside `src/domain/roles.ts` and `src/server/data/seed.ts`. Ask a capability instead (`canViewContent(actor)`, `getRoleDefinition(role).can.x`). `test/architecture.test.ts` fails if you break this.
4. **The client list is always paginated server-side.** `GET /api/clients` returns one page plus `total`. `limit` is capped at 100 in `http/schemas.ts`. Don't add an endpoint, server action, or page prop that returns the full array, even "just for export".
5. **Auth state is never cached.** Every request goes through `resolveSession()`, which reads the user's current `status` and `role` from the store. Keep `cacheComponents: false`. Don't add `"use cache"` or `"use cache: private"` to anything that reads the session. Don't put the role or status into the cookie.
6. **One PATCH endpoint for user edits** (`/api/users/[id]`). Don't add side doors like `/deactivate` or `/promote`. Every change has to pass through `authorizeUserUpdate()`.
7. No `any` and no `@ts-ignore` in `src/server` or `src/domain`. If a cast is truly needed, add a comment saying why.

## Adding a fourth role (worked example)

Everything happens in **`src/domain/roles.ts`**:
1. Add a key to `Role`, e.g. `Auditor: "auditor"`.
2. Add a `ROLE_DEFINITIONS[Role.Auditor]` entry. TypeScript won't compile until every capability is set: `viewUsers`, `createUser`, `editProfile`, `changeRole`, `changeStatus`, `assignManager`, `viewContent`, plus `landingPath` and `canHaveReports`.
3. Seed an account for it in `seed.ts` if you want to log in as one, and add tests.

Nothing else should need editing: zod validation (`z.enum(Role)`), role dropdowns (`meta.roleOptions`), nav links, landing redirects and policy all derive from that file. **If you find yourself editing `policy.ts` to add a role, stop.** Either a capability is missing from `RoleDefinition` (add the capability, then use it in policy), or you're about to write an inline role check.

Scope values: `"all"`, `"directReports"` (where `target.managerId === actor.id`, never the actor themself), or `"none"`. If a new role needs a new kind of scope, add it to the `Scope` union and handle it in `isInScope()` in policy.ts. The `switch` is exhaustive, so TypeScript will point you there.

## Counter-intuitive things you'll get wrong on first contact

- **Roles aren't a hierarchy.** IT is *refused* on `/content` and `/api/clients` (403). That's intended. Don't "fix" it by making IT a superset of manager.
- **"Last IT" means last *administrator*.** Rule 4 counts active accounts whose role has both `changeRole` and `changeStatus` (`isAdministratorRole()`). Today that's exactly IT. If you give a new role those powers, it counts toward the quorum automatically.
- **Order of denials is deliberate.** `authorizeUserUpdate()` returns `LAST_ADMINISTRATOR` before `SELF_LOCKOUT`, so that the last IT deactivating themselves gets a *different* primary reason from the first attempt (brief, scenario 11). Both are returned in `details`.
- **Any change to your own role counts as a "demotion".** With non-hierarchical roles there's no "lower", so nobody may change their own role or deactivate themselves. IT *may* edit their own name and email.
- **Managers get 404, not 403, for users outside their team** (no probing which ids exist). They get 403 for their own record and for fields they can't change on their reports.
- **Unchanged fields aren't permission-checked.** A manager PATCHing `{ fullName, role: <same role> }` succeeds. Only real changes need the capability.
- **No `proxy.ts` (formerly middleware) for auth, on purpose.** It may run outside the main runtime, so it can't see the in-memory session table or the user's current status. Gate pages with `requirePageActor(policyFn)` in the page itself.
- **The store lives on `globalThis`** (`data/store.ts`) because route handlers and pages are separate bundles. A plain module-level `const` can silently fork into two stores, so login works but pages see nobody logged in.
- **Rule 4 is safe without locks only because check-and-write are synchronous** inside `updateUser()`. Don't introduce an `await` between `authorizeUserUpdate()` and `store.users.set()`. If you move to a real DB, wrap both in a transaction.
- **403 pages use `forbidden()`** (needs `experimental.authInterrupts`, already on). Never redirect a logged-in user who lacks access; that's how redirect loops start. Don't call `forbidden()` in the root layout.
- **Deactivating a manager doesn't orphan their reports.** Kateryna (manager Taras is deactivated) stays assigned and can still log in. Changing a manager's *role* to one that can't have reports is blocked until IT reassigns the reports.
- **Client data is deterministic** (seeded PRNG): `cl-0001` is the same client after every restart, and tests rely on that.
- **`window.location.assign("/login")` in `components/api.ts` is intentional.** A hard reload on 401 discards the old session's client state.
