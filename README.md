# User Management & Content

A small Next.js 16 app with three non-hierarchical roles (IT, manager, user), an in-memory store, a server-paginated directory of 1,250 generated clients, and a permission model enforced on the server, so it holds when the API is called directly.

## 1. How to run it

Requires Node 20.9+ (developed on Node 22).

```bash
npm install
npm run dev          # → http://localhost:3000
# or a production build:
npm run build && npm start

npm test             # 15 unit tests for the permission policy (rules 2–4)
npm run check        # typecheck + lint + tests
```

Data lives in memory and is re-seeded on every server start.

## 2. Seeded accounts

Every account uses the password **`password123`**.

| Email | Name | Role | Status | Manager | Why it exists |
|---|---|---|---|---|---|
| ivan@corp.test | Ivan Kovalenko | IT | active | — | Scenarios 10, 11 |
| sofia@corp.test | Sofia Bondar | IT | active | — | Second IT, makes rule 4 testable |
| anna@corp.test | Anna Shevchenko | manager | active | — | Has exactly 4 direct reports (scenario 7) |
| olena@corp.test | Olena Melnyk | user | active | Anna | Scenario 12 |
| maksym@corp.test | Maksym Tkachenko | user | active | Anna | |
| iryna@corp.test | Iryna Lysenko | user | active | Anna | |
| yulia@corp.test | Yulia Boyko | user | **deactivated** | Anna | Already-deactivated user (can't log in) |
| bohdan@corp.test | Bohdan Kravchenko | manager | active | — | The "different manager" |
| dmytro@corp.test | Dmytro Savchenko | user | active | Bohdan | Anna must not be able to edit him |
| mark@corp.test | Mark Rudenko | manager | active | — | Manager with **no** direct reports |
| taras@corp.test | Taras Moroz | manager | **deactivated** | — | Deactivated manager |
| kateryna@corp.test | Kateryna Pavlenko | user | active | Taras | User whose manager is deactivated |
| roman@corp.test | Roman Hnatiuk | user | active | — | Unassigned user (no manager may edit him) |

Clients: 1,250 generated at startup by `src/data/client-generator.ts`, about 30% churned. A seeded PRNG keeps ids (`cl-0001` … `cl-1250`) stable across restarts.

## 3. Auth approach, and how rule 5 works

**Server-side sessions with an opaque token in an httpOnly cookie.** On login, `createSession()` generates 32 random bytes and stores `token → userId` in the in-memory session table. The cookie (`session`, `HttpOnly`, `SameSite=Lax`, `Secure` in production) carries only that token.

**Why not JWT.** A JWT is valid until it expires, so a deactivated manager could keep using one. The only fix is to look the user up on every request anyway, and at that point a JWT adds signing, secret management and claim staleness while giving us nothing in return. A session table also lets us revoke instantly, and we already have a store.

**Why not NextAuth or a library.** There's no OAuth or provider requirement, and email/password against an in-memory store takes about 60 lines of code I can explain line by line. A library would hide exactly the part this task grades.

**How rule 5 works.** Every page and every API route resolves the actor through `resolveSession()` (`src/server/auth/session.ts`). On *each request*, that function:
1. finds the session by token,
2. re-reads the user from the store,
3. rejects the session (and deletes it) if the user is missing or `status !== "active"`.

The user's status and role are never copied into the cookie or session, so there is nothing stale to trust. When Ivan deactivates Olena, her very next request finds `status: "deactivated"`, and she gets a 401 from the API or a redirect to `/login` from a page. Role changes take effect on the next request the same way. As a clean-up, `updateUser()` also deletes the deactivated user's sessions, but correctness doesn't depend on that step.

Two framework details make this work in Next 16:
- `cacheComponents` is **off**. Its recommended auth pattern (`"use cache: private"`) memoises the resolved user, and that would delay rule 5.
- There is **no `proxy.ts`** (formerly middleware) doing auth. Next documents proxy for optimistic, cookie-only checks, and it may run outside the main runtime, so it can't see the in-memory session table. Each page gates itself via `requirePageActor()`.

## 4. Every place a permission decision is made

**Decisions: one file.** `src/server/auth/policy.ts` holds every "may this actor do this?" answer: feature access, visibility scope, per-target actions, `authorizeUserUpdate()` (rules 1–4). The functions are pure and get their data from `src/types/Roles.ts` (the capability matrix), read through the helpers in `src/lib/roles.ts`.

**Where those decisions get enforced (the call sites):**

| Call site | Calls | Protects |
|---|---|---|
| `src/server/services/users.ts` | `canAccessUserManagement`, `filterVisibleUsers`, `canCreateUser`, `canAssignManagers`, `canViewUser`, `authorizeUserUpdate`, `canViewContent` | All of `/api/users*`, `/api/profile`, the `/manage-users` and `/content/me` pages |
| `src/server/services/clients.ts` | `canViewContent` | `/api/clients*`, client detail page |
| `src/server/auth/guards.ts` → `requirePageActor(policyFn)` in the 4 protected pages | `canViewContent` / `canAccessUserManagement` | Page rendering: 403 or redirect to `/login` |

`src/app/(main)/layout.tsx` also calls `canViewContent` / `canAccessUserManagement`, but only to decide which nav links to *show*. The UI's enabled/disabled controls come from `allowedActionsOn()`, computed server-side and sent as `allowed` flags. No client code makes a permission decision, and ESLint stops `src/components` and `src/client` from importing server code, the store or the role matrix.

## Architecture in one picture

```
Browser ──fetch──▶ src/app/api/**/route.ts ─┐
Browser ──nav────▶ src/app/**/page.tsx ─────┤  (thin: authenticate → validate → delegate)
                                            ▼
                         src/server/auth/guards.ts   ← resolveSession(): who is this, RIGHT NOW?
                                            ▼
                         src/server/services/*.ts    ← use-cases
                              │   1. ask policy.ts   (permission + invariants)
                              │   2. validate vs data (email unique, manager valid, no cycles)
                              │   3. write to store   (synchronous → no race on rule 4)
                              ▼
                         src/data/store.ts           ← one object on globalThis
```

### Rule-by-rule

| Rule | Where | How |
|---|---|---|
| 1. Only IT creates users / changes role / status | `policy.ts` capability flags from `Roles.ts` | `createUser` checks `canCreateUser`; `authorizeUserUpdate` checks `changeRole`, `changeStatus`, `assignManager` for every field that *actually changes* |
| 2. Managers edit name/email of direct reports only | `isInScope("directReports")` | `target.managerId === actor.id && target.id !== actor.id`. Other managers, self and unassigned users all fail. Out-of-team users return 404 (no id probing). |
| 3. No self-deactivate / self-demote | `authorizeUserUpdate` | Any change to your own role, or deactivating yourself → `409 SELF_LOCKOUT` |
| 4. Never zero active IT | `authorizeUserUpdate` | If the change would leave the target not an active administrator and nobody else is one → `409 LAST_ADMINISTRATOR`. Covers both deactivation and demotion. |
| 5. Deactivation is immediate | `session.ts` | Status is re-read on every request; nothing is cached |
| 6. A new role changes one place | `src/types/Roles.ts` | Capabilities, not role names; `Record<Role, …>` makes TypeScript demand a full definition. `src/lib/roles.ts` only reads the matrix, so it never changes. |

### API

All errors share one shape: `{ "error": { "code", "message", "details"? } }`.

| Method & path | Who | Notes |
|---|---|---|
| `POST /api/auth/login` `{email,password}` | anyone | Sets the session cookie, returns `{ landingPath }` |
| `POST /api/auth/logout` | anyone | Destroys the session, 303 → `/login` |
| `GET /api/profile` | manager, user | Own profile (the API behind `/content/me`) |
| `GET /api/clients?page&limit&sort&order&q&status` | manager, user | One page + `total`/`totalPages`. `limit` ≤ 100. |
| `GET /api/clients/:id` | manager, user | |
| `GET /api/users` | IT (all), manager (reports) | Each row carries server-computed `allowed` flags |
| `POST /api/users` | IT | `{fullName,email,password,role,managerId?}` |
| `PATCH /api/users/:id` | depends on field | Any subset of `{fullName,email,role,status,managerId}`. Unknown keys → 422. |

Status codes: 401 not logged in · 403 not permitted · 404 not found / out of scope · 409 invariant or conflict (`SELF_LOCKOUT`, `LAST_ADMINISTRATOR`, email taken) · 422 invalid input.

### Try the scenarios with curl

```bash
B=http://localhost:3000
login() { curl -s -c /tmp/$1.jar -H 'content-type: application/json' \
  -d "{\"email\":\"$1@corp.test\",\"password\":\"password123\"}" $B/api/auth/login; }
login anna; login ivan; login olena

# 7: Anna can't edit Dmytro            → 404 NOT_FOUND
curl -s -b /tmp/anna.jar -X PATCH -H 'content-type: application/json' -d '{"fullName":"x"}' $B/api/users/u-dmytro
# 8: Anna → IT                          → 403 FORBIDDEN
curl -s -b /tmp/anna.jar -X PATCH -H 'content-type: application/json' -d '{"role":"IT"}' $B/api/users/u-anna
# 9: one page of clients                → 25 items, total 1250
curl -s -b /tmp/anna.jar "$B/api/clients?page=2&limit=25"
# 10: IT refused content                → 403
curl -s -o /dev/null -w '%{http_code}\n' -b /tmp/ivan.jar $B/content
# 11: self → SELF_LOCKOUT, Sofia → 200, self again → LAST_ADMINISTRATOR
for id in u-ivan u-sofia u-ivan; do curl -s -b /tmp/ivan.jar -X PATCH \
  -H 'content-type: application/json' -d '{"status":"deactivated"}' $B/api/users/$id; echo; done
# 12: deactivate Olena; her next request → 401
curl -s -b /tmp/ivan.jar -X PATCH -H 'content-type: application/json' -d '{"status":"deactivated"}' $B/api/users/u-olena
curl -s -o /dev/null -w '%{http_code}\n' -b /tmp/olena.jar $B/api/clients
```

## Decisions worth explaining

- **Policy is pure, services enforce.** Policy functions take the actor, the target and the user list, and return a decision. Services call them right next to the write, so no route can forget a check, and policy can be unit-tested without HTTP.
- **One PATCH endpoint.** Deactivate, promote, rename and reassign all go through `authorizeUserUpdate()`. There's no side door that could skip a check.
- **Only real changes are permission-checked.** A form that re-sends an unchanged role isn't asking to change the role.
- **Rule 4 is phrased as "administrator".** It counts active accounts whose role can change both roles and statuses, i.e. the people who can recover the system. Today that's exactly IT. A future role with the same powers would count automatically.
- **Denial order.** `LAST_ADMINISTRATOR` comes before `SELF_LOCKOUT`, which gives scenario 11 its "different reason". Both are returned.
- **The URL drives the client table.** Page, sort and filter live in the query string, so refresh and back/forward work. Each click is also a server navigation, which re-checks the session before the API call even runs.
- **Org-chart integrity.** A manager must have a role with `canHaveReports`; there are no reporting cycles; and you can't change a manager's role away from manager while they still have reports.

## Testing

- `npm test` runs unit tests for `src/server/auth/policy.ts`: the role matrix, direct-report scope (rule 2), self-lockout (rule 3) and the last administrator (rule 4).
- Scenarios 7–12 were verified against the running API with the curl commands above. Restart `npm run dev` first: they change in-memory data.
- Not automated yet: the scenario walkthrough (see "With another four hours").

## Time spent

About 4 h 45 min of building, in one sitting (11:00–15:45 in the commit history), plus the documentation afterwards. The order was deliberate: the permission policy, sessions and the users/clients API (rules 1–5) were built and verified with curl first; the UI came after.

## 5. With another four hours

1. **Audit trail.** An append-only `auditLog` in the store, written inside `updateUser`/`createUser` (actor, target, before → after, timestamp), plus a read-only view for IT.
2. **Automated scenario tests.** Turn the curl walkthrough above into vitest tests that call the route handlers directly, then add Playwright for the UI half of the scenarios: the 403 page, the redirect after deactivation mid-browse, and checking that the network tab shows one page per request.
3. **Persistence behind a repository interface.** Move the store behind `UserRepository` / `SessionRepository` so swapping in Postgres touches one layer, with rule 4's check-and-write in a `SERIALIZABLE` transaction (or `SELECT … FOR UPDATE` on the IT rows).
4. **Session hardening.** Sliding expiry, session rotation on login, a CSRF token for state-changing requests (SameSite=Lax covers most cases, not all), and rate limiting on `/api/auth/login`.
5. **UX polish.** Field-level validation messages, optimistic updates with rollback, a confirmation step before deactivation, and pagination for `/manage-users` once there are many users.
6. **Docker.** A multi-stage image using `output: "standalone"`.
