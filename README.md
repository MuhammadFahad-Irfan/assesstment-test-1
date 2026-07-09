# Backend Architecture & Flow

Event Budgeting API — a multi-tenant NestJS service that lets workspaces manage
events, track budget line items, and generate AI budget proposals (Gemini) that
must be reviewed before anything is written to the database.

- **Framework:** NestJS 10 (Express platform)
- **DB / ORM:** MySQL via Prisma
- **Auth:** JWT (Passport) + per-request workspace membership check
- **AI:** Google Gemini (`@google/generative-ai`)
- **Real-time:** Socket.IO gateway, JWT-authenticated
- **HTTP logging:** Morgan piped through the Nest logger

---

## 1. Module map

`AppModule` ([src/app.module.ts](../src/app.module.ts)) wires everything together:

```
AppModule
├── ConfigModule (global)          # .env
├── PrismaModule (global)          # PrismaService — single DB client
├── AuthModule                     # register/login, JWT, global JwtAuthGuard
├── EventsModule                   # events CRUD + budget summary
├── BudgetItemsModule              # manual budget line items
├── AiModule                       # Gemini proposals: chat / approve / reject
└── RealtimeModule                 # Socket.IO gateway (budget:updated)
```

Cross-module dependencies that matter:

- `AiModule` imports `EventsModule` (ownership checks) and `RealtimeModule`
  (to broadcast after approval).
- `RealtimeModule` imports `AuthModule` (re-exports `JwtModule`) so the gateway
  can verify handshake tokens.

---

## 2. Data model

Defined in [prisma/schema.prisma](../prisma/schema.prisma). Multi-tenancy is the
central idea: **users belong to workspaces through a `Membership` join table**,
and every business entity hangs off a workspace.

```
User ──< Membership >── Workspace ──< Event ──< BudgetItem
                                          └──< Proposal (PENDING → APPROVED/REJECTED)
```

| Model        | Key fields                                                        | Notes |
|--------------|-------------------------------------------------------------------|-------|
| `User`       | `email` (unique), `password` (bcrypt hash)                        | |
| `Workspace`  | `name`                                                            | The tenant boundary. |
| `Membership` | `userId`, `workspaceId`, unique together                          | A user can be in many workspaces. |
| `Event`      | `title`, `date`, `currency` (ISO 4217), `workspaceId`            | Scoped to a workspace. |
| `BudgetItem` | `category`, `description`, `amount` `Decimal(14,2)`, `currency`   | Scoped to an event. Decimal serializes to a **string** in JSON. |
| `Proposal`   | `userMessage`, `items` (JSON), `status` enum                     | AI output held as a pending action; items copied to `BudgetItem` only on approval. |

`ProposalStatus` = `PENDING | APPROVED | REJECTED`. There is at most one
`PENDING` proposal per event at a time (enforced in code, see §6).

---

## 3. Request lifecycle

Every HTTP request flows through the same pipeline:

```
Request
  │
  ├─ Morgan            log the request (main.ts) — 'dev' locally, 'combined' in prod
  │
  ├─ JwtAuthGuard      GLOBAL guard (APP_GUARD). Validates `Authorization: Bearer <jwt>`.
  │                    Routes marked @Public() (register/login) skip it.
  │                    On success → request.user = { id, email }.
  │
  ├─ WorkspaceGuard    Per-controller. Reads `x-workspace-id` header, confirms the
  │                    user has a Membership in it. On success → request.workspaceId.
  │
  ├─ ValidationPipe    GLOBAL (main.ts). whitelist + forbidNonWhitelisted + transform.
  │                    Rejects unknown fields, coerces types, runs class-validator DTOs.
  │
  └─ Controller → Service → Prisma → MySQL
```

Two layers of protection combine into the multi-tenant guarantee:

1. **`JwtAuthGuard`** ([src/auth/guards/jwt-auth.guard.ts]) — registered globally
   in [AuthModule](../src/auth/auth.module.ts) as `APP_GUARD`, so **every route is
   protected by default**. The `@Public()` decorator opts a route out.
   `JwtStrategy.validate()` re-loads the user from the DB, so a token for a
   deleted user is rejected.
2. **`WorkspaceGuard`** ([src/common/guards/workspace.guard.ts]) — applied on the
   `events`, `budget-items`, and `ai` controllers. It turns the `x-workspace-id`
   header into a verified `request.workspaceId`. Services then filter **every**
   query by `workspaceId`, so one tenant can never read or write another's data
   (cross-workspace reads return `404`, not `403`, to avoid leaking existence).

`@WorkspaceId()` and `@CurrentUser()` are param decorators that pull those values
off the request for controller handlers.

---

## 4. Authentication flow

### Register — `POST /auth/register` (public)

Body: `{ email, password (min 8), workspaceName (required, 1–100 chars) }`
([RegisterDto](../src/auth/dto/register.dto.ts)).

[AuthService.register](../src/auth/auth.service.ts) does this **atomically** in one
transaction:

1. Reject if the email already exists (`409 Conflict`).
2. Hash the password with bcrypt.
3. Create `Workspace` (named `workspaceName`) → `User` → `Membership` linking them.
4. Return `{ accessToken, user, workspaceId }`.

### Login — `POST /auth/login` (public)

Verifies email + bcrypt password, returns `{ accessToken, user, workspaceIds[] }`
(all workspaces the user can act in). Invalid credentials → `401` (message is
intentionally generic).

### Using the token

The client stores the JWT and the active workspace id, then sends **both** on
every subsequent request:

```
Authorization: Bearer <accessToken>
x-workspace-id: <workspaceId>
```

`GET /auth/me` echoes the authenticated user (handy for the frontend to confirm
auth).

---

## 5. Route reference

All routes require `Authorization` unless marked **public**. All routes under
`/events*` additionally require the `x-workspace-id` header.

| Method | Path                                                  | Purpose |
|--------|-------------------------------------------------------|---------|
| POST   | `/auth/register`                                      | **public** — create user + workspace |
| POST   | `/auth/login`                                         | **public** — sign in |
| GET    | `/auth/me`                                             | current user |
| GET    | `/events`                                              | list events (+ total spend) |
| POST   | `/events`                                              | create event |
| GET    | `/events/:id`                                          | event + budget summary (per-category breakdown) |
| PATCH  | `/events/:id`                                          | update event |
| DELETE | `/events/:id`                                          | delete event |
| GET    | `/events/:eventId/budget-items`                       | list items |
| POST   | `/events/:eventId/budget-items`                       | add a manual item |
| PATCH  | `/events/:eventId/budget-items/:itemId`               | update an item |
| DELETE | `/events/:eventId/budget-items/:itemId`               | delete an item |
| POST   | `/events/:eventId/ai/chat`                            | generate a proposal (saved PENDING) |
| GET    | `/events/:eventId/ai/proposals/pending`               | current pending proposal, if any |
| POST   | `/events/:eventId/ai/proposals/:proposalId/approve`   | approve → write items |
| POST   | `/events/:eventId/ai/proposals/:proposalId/reject`    | reject → discard |

---

## 6. AI Budget Assistant flow (core feature)

Handled by [AiController](../src/ai/ai.controller.ts) → [AiService](../src/ai/ai.service.ts)
→ [GeminiService](../src/ai/gemini.service.ts). **The AI never writes to the budget
table directly.** It produces a *pending proposal*; only an explicit approval
copies the items into `BudgetItem`.

### Chat — generate a proposal

`POST /events/:eventId/ai/chat` with `{ message }`:

1. Load the event, scoped to the workspace (`404` if not owned).
2. **Guard: one pending proposal per event.** If a `PENDING` proposal already
   exists → `409 Conflict`. New proposals are blocked until it's approved/rejected.
3. Call Gemini with a prompt that includes the event **title, date, and currency**,
   instructing it to return a JSON array of line items in that currency.
4. **Currency check** (`assertCurrencyMatches`): if *any* returned item's currency
   ≠ the event currency, reject the **entire** proposal with `400` — nothing is
   saved.
5. Persist the proposal as `PENDING` (items stored as JSON).
6. Return `{ id, eventId, status, currency, items, total, createdAt }` for the
   frontend to render as a review card.

### Approve — commit the proposal

`POST /events/:eventId/ai/proposals/:proposalId/approve`:

1. Verify event ownership and that the proposal is still `PENDING`
   (`404`/`409` otherwise).
2. Re-run the currency check defensively (in case the event currency changed).
3. In **one transaction**: `createMany` the budget items → mark the proposal
   `APPROVED` → return the event's full item list.
4. Emit `budget:updated` to the workspace room over Socket.IO (see §7).
5. Return `{ proposalId, status: APPROVED, addedItems, budgetItems }`.

### Reject — discard the proposal

`POST /events/:eventId/ai/proposals/:proposalId/reject`: marks the proposal
`REJECTED`. Nothing is written to the budget. This frees the event to accept a
new proposal.

### Sequence

```
Client ──POST /ai/chat {message}──▶ AiService
                                     │ check no PENDING exists      (else 409)
                                     │ GeminiService.generate(title,date,currency)
                                     │ assertCurrencyMatches         (else 400)
                                     │ save Proposal(PENDING)
        ◀── proposal {items,total} ──┘
   (user reviews the card, clicks Approve)
Client ──POST /ai/.../approve──────▶ AiService
                                     │ TX: createMany(BudgetItem) + Proposal→APPROVED
                                     │ gateway.emitBudgetUpdated(workspaceId)
        ◀── {addedItems, items} ─────┘        │
                                              ▼
                               Socket.IO 'budget:updated' → all workspace clients refresh
```

### GeminiService details

[GeminiService](../src/ai/gemini.service.ts):

- Model is configurable via `GEMINI_MODEL` (default `gemini-2.5-flash`).
- Requests `responseMimeType: 'application/json'` and a strict prompt (exact keys,
  4–10 items, event currency only).
- `parseItems()` is defensive: strips stray markdown fences, falls back to
  extracting the first `[...]` block, tolerates `{ items: [...] }` / `{ budget: [...] }`
  wrappers, validates each item's shape, and normalizes amounts (2 dp) and
  currency (uppercase). Malformed output → `500`.

---

## 7. Real-time flow

[EventsGateway](../src/realtime/events.gateway.ts) is a JWT-authenticated Socket.IO
gateway.

**Handshake / auth:**

```js
io(url, { auth: { token: <JWT>, workspaceId: <id> } })
```

`handleConnection`:
1. Read `token` + `workspaceId` from the handshake (`auth` object, or a
   `Bearer` Authorization header).
2. `jwt.verify(token)` — invalid/missing → disconnect.
3. Confirm the user has a `Membership` in that workspace — not a member → disconnect.
4. `client.join('workspace:<id>')` — join the per-workspace room.

**Broadcast:** `emitBudgetUpdated(workspaceId, { eventId, reason })` sends
`budget:updated` **only to that workspace's room**, so tenants never see each
other's traffic. It's called by `AiService.approve` after items are written.

The frontend opens one socket per session and, on `budget:updated`, invalidates
the affected event's cache — so an approval by any client refreshes everyone's
budget view **without a page reload**.

---

## 8. Error semantics

| Status | When |
|--------|------|
| `400 Bad Request`  | DTO validation fails; proposal currency mismatch; malformed Gemini output |
| `401 Unauthorized` | missing/invalid JWT; bad login credentials; user no longer exists |
| `403 Forbidden`    | missing `x-workspace-id`; user not a member of that workspace |
| `404 Not Found`    | event/proposal missing or owned by another workspace |
| `409 Conflict`     | duplicate email on register; a pending proposal already exists; proposal already approved/rejected |
| `500`              | Gemini request failed or returned non-JSON |

Cross-tenant access is deliberately reported as `404` (not `403`) so the API
doesn't reveal that a resource exists in another workspace.

---

## 9. Environment & running

Required `.env` (see [.env.example](../.env.example)):

| Var              | Purpose |
|------------------|---------|
| `DATABASE_URL`   | MySQL connection string |
| `JWT_SECRET`     | signing secret for JWTs |
| `JWT_EXPIRES_IN` | token lifetime (default `1d`) |
| `GEMINI_API_KEY` | Google Gemini key |
| `GEMINI_MODEL`   | model name (default `gemini-2.5-flash`) |
| `PORT`           | HTTP port (default `3000`) |
| `CORS_ORIGIN`    | comma-separated allowed origins (default `*`) |

```bash
npm install
npm run prisma:generate
npm run prisma:migrate      # create/apply the schema
npm run start:dev           # http://localhost:3000
```

Bootstrap ([src/main.ts](../src/main.ts)) installs Morgan logging, the global
`ValidationPipe`, and CORS before listening.
