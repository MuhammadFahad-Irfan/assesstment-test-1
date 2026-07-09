# Event Budgeting API

Multi-tenant event budgeting platform backend.
**Stack:** NestJS · Prisma · MySQL · Socket.IO · Google Gemini (`@google/generative-ai`).

Users register/log in (JWT). Every request carries an `x-workspace-id` header and is
scoped to a workspace the user belongs to. Events hold budget items. An AI assistant
drafts budget proposals via Gemini; proposals are saved as **pending** actions and only
written to the budget on explicit **approval**, which then pushes a real-time refresh
to every connected client in the workspace.

---

## Prerequisites

- Node.js 18+ (20+ recommended)
- A running MySQL 8 instance
- A Google Gemini API key — https://aistudio.google.com/app/apikey

## Setup

```bash
cd api
cp .env.example .env          # then edit values (DATABASE_URL, JWT_SECRET, GEMINI_API_KEY)
npm install
npx prisma generate           # generates the typed Prisma client (required before build)
npx prisma migrate dev --name init   # creates tables in MySQL
npm run start:dev             # http://localhost:3000
```

> `prisma generate` needs network access to download the Prisma query engine. If you
> cloned this in a restricted environment, run it once where network is available.

### Environment variables (`.env`)

| Key              | Description                                        |
| ---------------- | -------------------------------------------------- |
| `DATABASE_URL`   | MySQL connection string                            |
| `JWT_SECRET`     | Secret used to sign/verify JWTs                    |
| `JWT_EXPIRES_IN` | Token lifetime (e.g. `1d`)                         |
| `GEMINI_API_KEY` | Google Gemini API key                              |
| `GEMINI_MODEL`   | Model name (default `gemini-2.5-flash`)            |
| `PORT`           | HTTP port (default `3000`)                         |
| `CORS_ORIGIN`    | Allowed frontend origin(s), comma-separated        |

---

## Auth model

- `POST /auth/register` creates a **user + workspace + membership** atomically and
  returns `{ accessToken, workspaceId }`.
- Send `Authorization: Bearer <token>` on every request except register/login
  (enforced by a global JWT guard).
- Send `x-workspace-id: <id>` on every scoped request. A `WorkspaceGuard` confirms the
  user is a member of that workspace, else **403**.

## Endpoints

### Auth
| Method | Path             | Notes                          |
| ------ | ---------------- | ------------------------------ |
| POST   | `/auth/register` | public                         |
| POST   | `/auth/login`    | public                         |
| GET    | `/auth/me`       | returns current user           |

### Events (scoped to workspace)
| Method | Path           | Notes                                                   |
| ------ | -------------- | ------------------------------------------------------- |
| POST   | `/events`      | create `{ title, date, currency }`                      |
| GET    | `/events`      | list events, each with `totalSpend`                     |
| GET    | `/events/:id`  | single event **with computed `budgetSummary`**          |
| PATCH  | `/events/:id`  | update                                                  |
| DELETE | `/events/:id`  | delete                                                  |

`GET /events/:id` returns `budgetSummary`: `{ currency, totalSpend, breakdownByCategory }`.

### Budget items (nested under an event)
| Method | Path                                        |
| ------ | ------------------------------------------- |
| GET    | `/events/:eventId/budget-items`             |
| POST   | `/events/:eventId/budget-items`             |
| PATCH  | `/events/:eventId/budget-items/:itemId`     |
| DELETE | `/events/:eventId/budget-items/:itemId`     |

### AI budget assistant
| Method | Path                                                   | Notes                                            |
| ------ | ------------------------------------------------------ | ------------------------------------------------ |
| POST   | `/events/:eventId/ai/chat`                             | body `{ message }` → saves a **PENDING** proposal, returns line items |
| GET    | `/events/:eventId/ai/proposals/pending`                | the current pending proposal (if any)            |
| POST   | `/events/:eventId/ai/proposals/:proposalId/approve`    | writes items, emits socket event                 |
| POST   | `/events/:eventId/ai/proposals/:proposalId/reject`     | discards the proposal                            |

**AI rules enforced**
- The AI **never** writes to the DB directly — only approval does.
- The Gemini prompt always includes the event **title, date, and currency**.
- Every proposed item **must** use the event's currency; if not, the whole proposal is
  rejected with a `400` and nothing is saved.
- Only **one pending proposal** per event; a new `chat` while one is pending returns `409`.

## Real-time (Socket.IO)

Connect with an authenticated handshake:

```js
import { io } from 'socket.io-client';
const socket = io('http://localhost:3000', {
  auth: { token: '<JWT>', workspaceId: '<workspaceId>' },
});
socket.on('budget:updated', ({ eventId }) => {
  // refetch the event's budget — happens on proposal approval
});
```

The gateway verifies the JWT and workspace membership, then joins the socket to a
per-workspace room. On approval, `budget:updated` is broadcast only to that room.

## Postman collection

Import `postman/event-budgeting.postman_collection.json`. It captures `token`,
`workspaceId`, `eventId`, `itemId`, and `proposalId` automatically from responses, so
you can run the requests top to bottom.

## Project layout

```
src/
  main.ts                 bootstrap (validation, CORS)
  app.module.ts
  prisma/                 PrismaService (+ global module)
  common/                 @Public, @CurrentUser, @WorkspaceId, WorkspaceGuard
  auth/                   register/login, JWT strategy, global JwtAuthGuard
  events/                 CRUD + budget summary
  budget-items/           CRUD (scoped through event ownership)
  ai/                     GeminiService + AiService (proposal / approve / reject)
  realtime/               authenticated Socket.IO gateway
prisma/schema.prisma      data model
```
