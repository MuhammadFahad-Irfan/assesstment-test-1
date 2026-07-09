# Event Budgeting — Web

Minimal React + TypeScript frontend for the event budgeting platform.
**Stack:** React · Vite · TypeScript · TanStack Query · React Router · Socket.IO client.

## Setup

```bash
cd web
cp .env.example .env      # set VITE_API_URL if the API isn't on http://localhost:3000
npm install
npm run dev               # http://localhost:5173
```

Make sure the API (`/api`) is running first. The API's `CORS_ORIGIN` must include the
web origin (defaults to `http://localhost:5173`).

## What's here

- **Login / Register** (`/login`) — authenticates against the API, stores the JWT and
  workspace id, and redirects to the dashboard. Registration creates an account and
  workspace in one step, which is the fastest way to get a working session.
- **Events dashboard** (`/`) — lists every event in the workspace with its total budget,
  plus a form to create new events.
- **Event detail** (`/events/:id`) — the budget items table, a per-category breakdown,
  a manual "add item" form, and the AI chat panel.
- **AI chat panel** — type a message, send it, and the response renders as a **proposal
  card** listing every line item with a running total. **Approve** writes the items and
  the budget table updates without a page reload; **Reject** discards them. Nothing is
  saved until you approve.

## How server state is managed

All server state goes through **TanStack Query** (`src/hooks/*`). Mutations invalidate the
relevant query keys so views refresh automatically:

- Approving a proposal invalidates the event detail (`['event', id]`) and the events list,
  so the table and totals update in place.
- A **Socket.IO** connection (`useWorkspaceSocket`) listens for `budget:updated` and
  invalidates the same keys — this is what refreshes your view when *another* client in
  the workspace approves a proposal.

The axios client (`src/lib/api.ts`) attaches `Authorization: Bearer <jwt>` and
`x-workspace-id` to every request from the stored session.

## Structure

```
src/
  main.tsx            providers (QueryClient, Auth, Router)
  App.tsx             routes + authenticated layout (+ socket)
  auth/               AuthContext (session state)
  lib/                api client, socket, session storage, types, formatting
  hooks/              TanStack Query hooks (events, budget items, AI, socket)
  components/         BudgetTable, CategoryBreakdown, ProposalCard, AiChatPanel, ...
  pages/              LoginPage, EventsPage, EventDetailPage
```
