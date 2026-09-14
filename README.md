

<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="client/src/assets/images/tadbeer-logo.png">
  <source media="(prefers-color-scheme: light)" srcset="client/src/assets/images/tadbeer-logo.png">
  <img src="client/src/assets/images/tadbeer-logo.png" alt="TADBEER" width="420">
</picture>

### Smart Ticket Management System

AI-assisted helpdesk and task tracking for support teams — ticket triage, SLA monitoring,
Kanban workflow, role-based access and real-time in-app notifications.

<br>

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)
![License](https://img.shields.io/badge/License-Apache%202.0-D22128)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Seeding Demo Data](#seeding-demo-data)
- [Scripts](#scripts)
- [API Reference](#api-reference)
- [Roles and Permissions](#roles-and-permissions)
- [Data Model](#data-model)
- [Background Jobs](#background-jobs)
- [AI Capabilities](#ai-capabilities)
- [Production Build](#production-build)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Overview

**Tadbeer** (تدبير — *management, arrangement*) is a full-stack ticket management platform built
on the MERN stack with TypeScript end to end. It gives support organizations a single place to
raise, triage, assign, track and close work items, with an AI layer that classifies incoming
tickets, drafts resolutions and answers questions about the queue in natural language.

The system is designed around four roles — **user**, **agent**, **manager** and **admin** — with
server-enforced permissions on every route, department-scoped visibility, and SLA policies that
escalate work automatically before it breaches.

---

## Features

### Ticketing

- Create, update, assign, comment on and resolve tickets with attachments, tags and due dates.
- Five-stage lifecycle: `open` → `in-progress` → `pending` → `resolved` → `closed`.
- Categories: `Technical`, `Security`, `Feature`, `Account`, `Bug`.
- Four priority levels: `low`, `medium`, `high`, `urgent`.
- **Watchers** with per-user `read` / `write` permissions for cross-team collaboration.
- **Favorites**, **archive**, soft-delete **recycle bin** and permanent delete (admin/manager).
- Estimated vs. actual time tracking and a 1–5 satisfaction rating on closure.

### Workflow and visualization

- **Kanban board** with drag-and-drop status transitions (`@dnd-kit`).
- **Dashboard** with live queue statistics and a team workload widget.
- Dedicated views: Active Tickets, Pending Tasks, Completed, Team Projects, Archived,
  Recent Updates, Favorites, Recycle Bin and shared team/training spaces.
- **Reports** page with per-department and per-agent breakdowns.

### SLA management

- Per-priority SLA policies defining **response time** and **resolution time** in minutes.
- Live countdown component on every ticket.
- Automatic warning, escalation and breach stamping via a background monitor.
- SLA metrics endpoint for compliance reporting.

### AI assistance

- **Smart triage** — suggests category, priority and department from a ticket's title and body.
- **Resolution assist** — drafts next steps and a resolution summary for an open ticket.
- **Similar solved tickets** — vector-embedding search surfaces past fixes for the same issue.
- **Floating chat assistant** — an agentic chatbot with read-only and write tools scoped to the
  signed-in user's role and department.
- Sentiment classification on ticket text to flag frustrated reporters.

### Notifications

- In-app notification center with read / read-all / delete.
- Due-soon and overdue reminders generated on a schedule.
- Optional email alerts for urgent tickets via the **Brevo HTTP API** (preferred) or plain SMTP.
  Email is a progressive enhancement — if neither is configured, in-app notifications still fire.

### Security

- JWT authentication with bcrypt-hashed passwords.
- Role middleware guarding privileged routes server-side.
- `helmet`, strict CORS allow-listing, cookie parsing and a 300-request / 15-minute rate limit.
- Zod schema validation on AI inputs and outputs.

---

## Tech Stack

| Layer | Technologies |
| --- | --- |
| **Frontend** | React 19, TypeScript, Vite 7 (SWC), React Router 7, Tailwind CSS 4, Axios, Lucide icons, `@dnd-kit` |
| **Backend** | Node.js, Express 4, TypeScript, Mongoose 8, Zod |
| **Database** | MongoDB |
| **AI** | OpenRouter (OpenAI-compatible SDK), text embeddings, Google Generative AI |
| **Email** | Brevo HTTP API, Nodemailer (SMTP fallback) |
| **Security** | JWT, bcryptjs, Helmet, CORS, express-rate-limit |
| **Tooling** | ESLint 9, typescript-eslint, ts-node-dev, Morgan |

---

## Architecture

```
┌──────────────────────────────┐         ┌──────────────────────────────────┐
│  React 19 SPA (Vite :5173)   │         │  Express API (:5000)             │
│                              │  /api   │                                  │
│  pages/ · components/        │ ──────► │  routes → services → models      │
│  context/AuthContext         │         │  auth · role · error middleware  │
│  api/ (Axios + JWT attach)   │         │  AI services · mailer · jobs     │
└──────────────────────────────┘         └────────────────┬─────────────────┘
                                                          │ Mongoose
                                          ┌───────────────▼─────────────────┐
                                          │  MongoDB                        │
                                          │  users · Tickets · Departments  │
                                          │  comments · Notifications · SLA │
                                          └───────────────▲─────────────────┘
                                                          │
                                          ┌───────────────┴─────────────────┐
                                          │  Background jobs                │
                                          │  SLA monitor · due reminders ·  │
                                          │  recycle-bin cleanup            │
                                          └─────────────────────────────────┘
```

In development, Vite proxies `/api` to `http://localhost:5000`, so the client and API share an
origin and no extra CORS configuration is needed.

---

## Project Structure

```
TADBEER-Ticket-Management-System/
├── client/
│   ├── api/                  # Axios instance + typed API modules
│   ├── src/
│   │   ├── components/       # Header, Footer, AI assistant, SLA countdown, widgets
│   │   ├── context/          # AuthContext
│   │   ├── hooks/            # useAuth
│   │   ├── layouts/          # AuthLayout, DashboardLayout
│   │   ├── pages/            # Dashboard, Kanban, TicketDetails, Reports, …
│   │   ├── routes/           # ProtectedRoute
│   │   ├── style/            # Page-scoped CSS
│   │   └── assets/images/    # Brand assets
│   └── public/
├── server/
│   └── src/
│       ├── config/           # db.ts, env.ts
│       ├── controllers/      # auth, user, notification, ai
│       ├── middlewares/      # auth, role, error
│       ├── models/           # User, Ticket, Comments, Department, Notification, SLAPolicy
│       ├── routes/           # auth, users, tickets, notifications, departments, ai, sla
│       ├── services/         # business logic + services/ai/*
│       ├── jobs/             # slaMonitor, notification, cleanup
│       ├── utils/            # mailer, notify, hash, logger, ticketPermissions
│       ├── app.ts            # Express app wiring
│       └── server.ts         # Entry point
├── mongo-seed/               # Demo dataset + mongosh seed script
├── docs/                     # Diagrams and brand assets
├── shared/                   # Shared sample JSON fixtures
├── index.html                # Vite entry (mounts client/src/main.tsx)
├── vite.config.ts            # Dev server :5173, /api proxy → :5000
└── package.json              # Frontend deps + server passthrough scripts
```

> **Note:** the frontend `package.json` lives at the repository root; the backend has its own
> `package.json` inside `server/`. Both need to be installed.

---

## Getting Started

### Prerequisites

| Requirement | Version |
| --- | --- |
| Node.js | 18 or newer |
| npm | 9 or newer |
| MongoDB | 6 or newer (local instance or Atlas cluster) |

### 1. Clone the repository

```bash
git clone https://github.com/mohammadmasri9/TADBEER-Ticket-Management-System1.git
```

### 2. Install dependencies

```bash
npm install && npm install --prefix server
```

### 3. Configure the backend

Create a `server/.env` file. The minimum viable configuration is:

```ini
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/tadbeer
JWT_SECRET=replace-with-a-long-random-string
CLIENT_URL=http://localhost:5173
```

See [Environment Variables](#environment-variables) for the optional AI and email settings.

### 4. Seed demo data (optional but recommended)

```bash
mongosh "mongodb://127.0.0.1:27017/tadbeer" mongo-seed/seed.mongo.js
```

### 5. Run both servers

Start the API in one terminal:

```bash
npm run dev:server
```

Start the frontend in a second terminal:

```bash
npm run dev
```

| Service | URL |
| --- | --- |
| Frontend | http://localhost:5173 |
| API | http://localhost:5000 |
| Health check | http://localhost:5000/health |

Sign in with a seeded account, for example `admin@tadbeer.local` / `Password123`.

---

## Environment Variables

All backend configuration lives in `server/.env`.

| Variable | Required | Default | Description |
| --- | :---: | --- | --- |
| `MONGO_URI` | yes | — | MongoDB connection string |
| `JWT_SECRET` | yes | — | Secret used to sign access tokens |
| `PORT` | no | `5000` | API port |
| `NODE_ENV` | no | `development` | Enables request logging and background jobs outside `test` |
| `CLIENT_URL` | no | `http://localhost:5173` | Allowed CORS origin |
| `OPENROUTER_API_KEY` | no | — | Enables AI features; without it AI endpoints degrade gracefully |
| `AI_MODEL` | no | `openai/gpt-3.5-turbo` | Chat/completion model slug |
| `AI_EMBEDDING_MODEL` | no | `openai/text-embedding-3-small` | Model used for similar-ticket search |
| `AI_MAX_TOKENS` | no | `600` | Completion token cap |
| `AI_TEMPERATURE` | no | `0.2` | Sampling temperature |
| `BREVO_API_KEY` | no | — | Preferred email transport (HTTPS, works behind SMTP-blocking firewalls) |
| `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASS` `SMTP_FROM` | no | — | SMTP fallback transport |
| `APP_URL` | no | — | Base URL used in email deep links |
| `SLA_CHECK_INTERVAL_MINUTES` | no | `5` | SLA monitor frequency |
| `DUE_CHECK_INTERVAL_MINUTES` | no | `10` | Due-date reminder frequency |

The frontend reads one optional variable, `VITE_API_URL` (defaults to `http://localhost:5000`).

> Never commit real secrets. Keep `server/.env` out of version control.

---

## Seeding Demo Data

`mongo-seed/` ships a dataset matched to the Mongoose models. The script **clears and reloads**
the `users`, `Departments`, `Tickets`, `comments` and `Notifications` collections.

```bash
mongosh "mongodb://127.0.0.1:27017/tadbeer" mongo-seed/seed.mongo.js
```

All demo accounts use the password `Password123`:

| Email | Role |
| --- | --- |
| `admin@tadbeer.local` | admin |
| `it.manager@tadbeer.local` | manager |
| `security.manager@tadbeer.local` | manager |
| `billing.manager@tadbeer.local` | manager |
| `it.agent@tadbeer.local` | agent |
| `security.agent@tadbeer.local` | agent |
| `sara.user@tadbeer.local` | user |
| `khaled.user@tadbeer.local` | user |

> Importing through MongoDB Compass works too — keep the exact collection names above, since some
> models use custom capitalized collection names.

---

## Scripts

Run from the repository root.

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server on port 5173 |
| `npm run dev:server` | Start the API with hot reload on port 5000 |
| `npm run build` | Type-check and build the frontend to `dist/` |
| `npm run build:server` | Compile the backend to `server/dist/` |
| `npm run preview` | Preview the production frontend build |
| `npm run lint` | Run ESLint across the project |

---

## API Reference

Base URL: `http://localhost:5000/api`. Every route except `/auth/register`, `/auth/login` and
`/health` requires an `Authorization: Bearer <token>` header.

### Authentication

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | Public | Create an account |
| `POST` | `/auth/login` | Public | Exchange credentials for a JWT |
| `GET` | `/auth/me` | Authenticated | Current session profile |

### Tickets

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/tickets` | Authenticated | List tickets, scoped by role and department |
| `POST` | `/tickets` | Authenticated | Create a ticket |
| `GET` | `/tickets/:id` | Authenticated | Ticket detail with comments and watchers |
| `PUT` | `/tickets/:id` | Authenticated | Update ticket fields |
| `PATCH` | `/tickets/:id/status` | Authenticated | Change lifecycle status |
| `PATCH` | `/tickets/:id/assign` | Manager, Admin | Assign or reassign an owner |
| `POST` | `/tickets/:id/comments` | Authenticated | Add a comment |
| `POST` | `/tickets/:id/favorite` | Authenticated | Toggle favorite |
| `GET` | `/tickets/inbox` | Manager, Admin | Incoming / unassigned queue |
| `GET` | `/tickets/stats` | Authenticated | Aggregated counters for the dashboard |
| `POST` | `/tickets/smart-triage` | Authenticated | AI category, priority and department suggestion |
| `GET` | `/tickets/:id/similar-solved` | Authenticated | Embedding search over resolved tickets |
| `POST` | `/tickets/:id/watchers` | Manager, Admin | Add a watcher with `read` / `write` permission |
| `DELETE` | `/tickets/:id/watchers/:userId` | Manager, Admin | Remove a watcher |
| `POST` | `/tickets/:id/archive` | Manager, Admin | Archive |
| `POST` | `/tickets/:id/unarchive` | Manager, Admin | Restore from archive |
| `DELETE` | `/tickets/:id` | Manager, Admin | Soft-delete to recycle bin |
| `POST` | `/tickets/:id/restore` | Manager, Admin | Restore from recycle bin |
| `DELETE` | `/tickets/:id/permanent` | Manager, Admin | Permanent delete |

### Users

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/users` | Admin | List all users |
| `GET` | `/users/:id` | Authenticated | User profile |
| `POST` | `/users` | Admin | Create a user |
| `PUT` | `/users/:id` | Self or Admin | Update profile |
| `DELETE` | `/users/:id` | Admin | Delete a user |

### Departments

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/departments` | Authenticated | List departments |
| `GET` | `/departments/:id` | Authenticated | Department detail |
| `POST` | `/departments` | Admin | Create |
| `PUT` | `/departments/:id` | Admin | Update |
| `DELETE` | `/departments/:id` | Admin | Delete |

### Notifications

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/notifications` | Authenticated | List own notifications |
| `PATCH` | `/notifications/read-all` | Authenticated | Mark all as read |
| `PATCH` | `/notifications/:id/read` | Authenticated | Mark one as read |
| `DELETE` | `/notifications/:id` | Authenticated | Delete one |

### SLA

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/sla/policies` | Authenticated | List SLA policies |
| `PUT` | `/sla/policies/:id` | Manager, Admin | Update response and resolution targets |
| `GET` | `/sla/metrics` | Authenticated | Compliance and breach metrics |

### AI

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/ai/tickets/suggest` | Authenticated | Suggest category, priority and department |
| `POST` | `/ai/tickets/assist` | Authenticated | Draft resolution guidance |
| `POST` | `/ai/tickets/:ticketId/assist` | Authenticated | Ticket-scoped resolution guidance |
| `POST` | `/ai/chat` | Authenticated | Agentic chat over the user's accessible tickets |

---

## Roles and Permissions

| Capability | User | Agent | Manager | Admin |
| --- | :---: | :---: | :---: | :---: |
| Create tickets | ✅ | ✅ | ✅ | ✅ |
| Comment on and update own tickets | ✅ | ✅ | ✅ | ✅ |
| Work assigned tickets | — | ✅ | ✅ | ✅ |
| View department inbox | — | — | ✅ | ✅ |
| Assign and reassign tickets | — | — | ✅ | ✅ |
| Manage watchers | — | — | ✅ | ✅ |
| Archive, delete and restore | — | — | ✅ | ✅ |
| Edit SLA policies | — | — | ✅ | ✅ |
| Manage users | — | — | — | ✅ |
| Manage departments | — | — | — | ✅ |

Permissions are enforced by `requireRole()` middleware on the server — the UI hides unavailable
actions, but the API is the source of truth.

---

## Data Model

| Collection | Purpose | Key fields |
| --- | --- | --- |
| `users` | Accounts and org placement | `name`, `email`, `passwordHash`, `role`, `status`, `departmentId`, `expertise[]` |
| `Tickets` | Core work item | `title`, `description`, `category`, `priority`, `status`, `createdBy`, `assignee`, `departmentId`, `dueDate`, `watchers[]`, `attachments[]`, `tags[]`, `embedding[]`, SLA and lifecycle timestamps |
| `comments` | Threaded discussion | `ticketId`, `authorId`, body, timestamps |
| `Departments` | Routing targets | `name`, `description`, members |
| `Notifications` | In-app alerts | `userId`, `type`, `message`, `read`, `ticketId` |
| `SLAPolicies` | Per-priority targets | `priority` (unique), `responseTime`, `resolutionTime`, `isActive` |

User status values (`available`, `busy`, `offline`) feed the team workload widget and assignment
suggestions.

---

## Background Jobs

Started automatically by `server.ts` whenever `NODE_ENV` is not `test`.

| Job | Default interval | Responsibility |
| --- | --- | --- |
| **SLA monitor** | every 5 min | Stamps `slaWarnedAt`, `slaEscalatedAt` and `slaResponseBreachedAt`, escalates priority and notifies owners |
| **Due-date reminders** | every 10 min | Sends due-soon and overdue notifications, de-duplicated via `dueSoonNotifiedAt` / `overdueNotifiedAt` |
| **Cleanup** | hourly | Purges recycle-bin items past their retention window |

Intervals are configurable through `SLA_CHECK_INTERVAL_MINUTES` and `DUE_CHECK_INTERVAL_MINUTES`.

---

## AI Capabilities

AI requests are routed through **OpenRouter** using the OpenAI-compatible SDK, so any supported
model can be selected via `AI_MODEL`. Every AI response is validated against a **Zod** schema
before it reaches the database or the UI.

| Capability | Implementation |
| --- | --- |
| Ticket triage | `services/ai/ticketTriage.ts` — structured category / priority / department output |
| Resolution assist | `services/ai/aiService.ts` — `assistTicketAI`, `summarizeResolutionAI` |
| Sentiment | `classifySentimentAI` — flags negative reporter sentiment |
| Similar tickets | `services/ai/embeddings.ts` — cosine similarity over stored `embedding` vectors |
| Chat agent | `services/ai/knowledge/chatAgent.ts` — tool-calling loop with read-only and write tool sets, scoped to the caller's role and department |

**Without `OPENROUTER_API_KEY` the application still runs** — AI endpoints report that they are not
configured and the rest of the system is unaffected.

---

## Production Build

```bash
npm run build && npm run build:server
```

This produces:

- `dist/` — static frontend assets, ready for any CDN or static host
- `server/dist/` — the compiled API, started with `npm start --prefix server`

For production, set `NODE_ENV=production`, point `CLIENT_URL` at the deployed frontend origin, and
set `VITE_API_URL` at build time so the SPA targets the deployed API.

---

## Troubleshooting

**MongoDB connection fails on startup**
The server exits with `Missing MONGO_URI in .env` or a connection error. Verify `server/.env`
exists, the URI is reachable, and that Atlas IP allow-listing includes your address.

**CORS errors in the browser**
Add your frontend origin to `CLIENT_URL`. In development any `localhost` / `127.0.0.1` port is
allowed automatically, so this normally only affects deployed environments.

**Emails are never delivered**
Many corporate networks block outbound SMTP ports. Prefer `BREVO_API_KEY`, which sends over HTTPS
on port 443. If neither Brevo nor SMTP is configured the mailer no-ops by design, and in-app
notifications continue to work.

**AI endpoints report "not configured"**
Set `OPENROUTER_API_KEY` in `server/.env` and restart the API.

**Port already in use**
Change `PORT` in `server/.env` for the API and update the proxy target in `vite.config.ts` to
match. The Vite dev server port can be overridden with the `PORT` environment variable.

---

## License

Licensed under the **Apache License 2.0** — see [LICENSE](LICENSE) for the full text.

---

<div align="center">

**Tadbeer** — built by [Mohammad Almasri](https://github.com/mohammadmasri9)

</div>
