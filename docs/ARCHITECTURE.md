# NCF Venture Studio — Architecture & API Reference

This document is a deep-dive companion to the top-level `README.md`, intended for a developer picking up this codebase for the first time.

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Cloudflare Edge Network                   │
│                                                                   │
│  ┌───────────────────────────┐        ┌───────────────────────┐ │
│  │   Cloudflare Pages/Worker │◄──────►│   Cloudflare D1        │ │
│  │   (Hono app, src/index.tsx)│        │   (ncfvs-production)   │ │
│  │                            │        │   14 SQLite tables     │ │
│  │  - serves /static/* files │        └───────────────────────┘ │
│  │  - serves JSX HTML shell  │                                   │
│  │  - /api/* JSON routes     │                                   │
│  └───────────────────────────┘                                   │
└─────────────────────────────────────────────────────────────────┘
                 ▲
                 │ HTTPS (Fetch/Axios)
                 │
┌────────────────┴───────────────────────────────────────────────┐
│  Browser — Vanilla JS SPA (no framework, no bundler)             │
│  - login.js → app.js (router + AppState) → views_*.js            │
│  - Tailwind CSS via CDN, Axios via CDN, Day.js via CDN            │
│  - httpOnly cookie `ncfvs_token` carries the JWT automatically    │
└───────────────────────────────────────────────────────────────┘
```

There is **no separate frontend build** — the entire client is plain JS files served statically from `public/static/`, loaded by `src/renderer.tsx` in a fixed dependency order. There is **no client-side framework** (no React/Vue) — a single global `AppState` object plus a hand-rolled `navigateTo()` dispatcher drives all UI updates.

## 2. Backend — Request Lifecycle

1. `src/index.tsx` is the Hono app entry point. It mounts:
   - `serveStatic` for `/static/*` (serves everything in `public/static/`)
   - One Hono sub-app per resource under `/api/*` (see route table below)
   - The JSX `renderer` (from `src/renderer.tsx`) for the catch-all `*` route, which returns the HTML shell (`<div id="root"></div>` + script tags)
2. Every `/api/*` sub-app (except `/api/auth/login`) is protected by `authMiddleware` (`src/middleware/auth.ts`), which:
   - Reads the JWT from the `Authorization: Bearer <token>` header **or** the `ncfvs_token` httpOnly cookie (cookie is the primary path used by the SPA; header is a fallback for tooling/testing)
   - Verifies the HMAC-SHA256 signature and expiry via `verifyJwt()` (`src/lib/auth.ts`)
   - Loads the user row + their aggregated roles from D1, attaches to `c.set('user', ...)`
   - Rejects with `401` if missing/invalid/expired
3. Admin-only routes additionally run `adminOnly` middleware, which checks `user.is_admin` and rejects with `403` otherwise.
4. Content routes (posts/tasks/documents/gates/events) call `checkChannelAccess(db, user, channelKey, mode)` from `src/lib/access.ts` for **every single request** — this is what makes the frontend's channel filtering purely cosmetic; server-side checks are the actual security boundary.

## 3. Authentication & Security Details

| Concern | Implementation | Why |
|---|---|---|
| Password hashing | PBKDF2-SHA256, 100,000 iterations, random 16-byte salt, stored as `salt:hash` (hex) | Cloudflare Workers has no Node `crypto`/bcrypt; Web Crypto's `crypto.subtle.deriveBits` with PBKDF2 is the standards-based equivalent and runs natively on the edge |
| Session token | Hand-rolled HS256 JWT (`signJwt`/`verifyJwt` in `src/lib/auth.ts`) — base64url header/payload, HMAC-SHA256 signature via `crypto.subtle.sign` | No external JWT library needed; keeps the Worker bundle small (~99 KB total) |
| Session transport | httpOnly, `SameSite=Lax`, `Secure` (in production) cookie named `ncfvs_token`, 7-day expiry | httpOnly prevents XSS token theft; the SPA never touches the raw token in JS |
| Secret management | `JWT_SECRET` binding (Worker secret) with a hardcoded `DEV_SECRET` fallback for local dev only | **Must** be set via `wrangler pages secret put JWT_SECRET` before production use — see `docs/HOSTINGER_DEPLOYMENT.md` §1.4 |
| Authorization model | Multi-role RBAC — a user's effective permission set is the **union** of every role assigned via `user_roles`; `is_admin` flag short-circuits every check to "allow" | Matches the requirement that a person can simultaneously be e.g. both "EIR" and "Portfolio Team Member" and see the union of both role's channels |

## 4. Data Model (Cloudflare D1 / SQLite)

Defined in `migrations/0001_initial_schema.sql`, seeded in `migrations/0002_seed_data.sql`.

| Table | Purpose | Key relationships |
|---|---|---|
| `users` | Login accounts: username, password_hash, display_name, is_admin, is_active, profile fields (title, bio, skills, avatar_color) | — |
| `roles` | The 9 fixed role definitions (key, label, description) | — |
| `user_roles` | M:N join — a user can hold multiple roles | `users.id`, `roles.id` |
| `ventures` | Portfolio Hub / venture records: slug, name, stage, description, one-line pitch | — |
| `venture_members` | M:N join — which users belong to which venture's private hub | `ventures.id`, `users.id` |
| `posts` / `comments` | Discussion boards & announcements, scoped by a generic `channel_key` string (static or `venture:<slug>:<suffix>`) | `users.id` (author) |
| `tasks` | Kanban cards: title, description, status (backlog/todo/in_progress/review/done), priority, assignee, due date — scoped by `channel_key` | `users.id` (assignee) |
| `documents` | Document vault entries: title, doc_type, url, version, status — scoped by `channel_key` | `users.id` (uploader) |
| `gates` / `gate_votes` | Stage-Gate items with per-user unique vote (approve/reject/abstain) and a resolution status | `users.id` (voter), unique `(gate_id, user_id)` |
| `events` / `event_rsvps` | Calendar events with RSVP states (going/interested/declined) | `users.id`, unique `(event_id, user_id)` |
| `metrics` | Per-venture monthly KPIs (MRR, burn, runway, growth %, headcount), unique per `(venture_id, month)` | `ventures.id` |
| `jobs` | Open Studio Roles board postings | `users.id` (poster) |
| `roadmap_items` | Quarterly milestone timeline entries | — |

**The `channel_key` pattern** is what lets a handful of generic tables (`posts`, `tasks`, `documents`, `gates`, `events`) serve ~40 different named channels plus an unbounded number of dynamically created venture sub-channels, without a table-per-channel design. Static channels use their fixed key from `src/lib/channels.ts` (e.g. `stage1-mvp-kanban`); dynamic venture channels use `venture:<slug>:<suffix>` (e.g. `venture:acme-health:general`), parsed by `parseVentureChannel()` in `src/lib/access.ts`.

## 5. Permission / Navigation Source of Truth — `src/lib/channels.ts`

This single file defines:
- `ALL_ROLES`: the 9 role keys
- `CATEGORIES`: the 10 categories, each containing named channels with `{ key, name, icon, type, description, roles, announceOnly?, gateApprovers? }`
  - `roles` is either `'public'` (every authenticated user) or an array of `RoleKey` — a user needs **at least one** matching role (or `is_admin`) to see/read the channel
  - `type` drives which frontend view renderer is used (`discussion`, `kanban`, `document_vault`, `stage_gate`, `events`, `directory`, `jobs`, `roadmap`, `dealflow`, `dashboard`, `rules`)
  - `announceOnly`: only certain roles (defined per-channel) may post; everyone else is read-only
  - `gateApprovers`: which roles may cast a Stage-Gate vote (typically `leadership`)
- `PORTFOLIO_SUBCHANNELS`: the 4-channel template (`announcements`, `general`, `dev-and-product`, `growth-marketing`) cloned for every new venture
- Helper functions `hasAccess()`, `canPost()`, `ventureChannelKey()`, `findChannel()` used by both `src/lib/access.ts` (server enforcement) and conceptually mirrored in `public/static/app.js` (client-side nav rendering only — never trusted for security)

**To add a new static channel or category**: edit `CATEGORIES` in this one file — no other file needs to change for a read-only/discussion-type channel to appear correctly for the right roles.

## 6. Full API Reference

All routes are prefixed `/api`. All (except `POST /auth/login`) require a valid session (cookie or Bearer token). Admin-only routes are marked 🔒**Admin**. Routes requiring specific channel-role access are marked with the channel's role requirement inline in the route file, not duplicated here (see `src/lib/channels.ts` for the authoritative per-channel role map).

### Auth — `/api/auth`
| Method | Path | Description |
|---|---|---|
| POST | `/login` | Body `{username, password}` → verifies password, issues JWT, sets `ncfvs_token` cookie |
| POST | `/logout` | Clears the session cookie |
| GET | `/me` | Returns the current authenticated user + roles |

### Admin — `/api/admin` 🔒 Admin only
| Method | Path | Description |
|---|---|---|
| GET | `/roles` | List all 9 roles |
| GET | `/users` | List all users with their assigned roles |
| POST | `/users` | Create a user `{username, password, display_name, roles[], is_admin}` |
| PUT | `/users/:id` | Update a user's profile/roles/admin flag |
| POST | `/users/:id/toggle-active` | Flip `is_active` |
| POST | `/users/:id/reset-password` | Set a new password for a user |
| DELETE | `/users/:id` | Delete a user (blocked for self-deletion) |

### Channels / Navigation — `/api/channels`
| Method | Path | Description |
|---|---|---|
| GET | `/nav` | Returns the role-filtered category/channel tree + the caller's visible ventures (with their 4 dynamic sub-channels) |
| GET | `/access/:key` | Returns `{ canRead, canWrite }` for a given channel key against the caller's roles |

### Posts / Discussion — `/api/posts`
| Method | Path | Description |
|---|---|---|
| GET | `/:channelKey` | List posts + nested comments for a channel |
| POST | `/:channelKey` | Create a post (requires write access; `announceOnly` channels restrict to eligible roles) |
| DELETE | `/:channelKey/:id` | Delete a post (author or admin) |
| POST | `/:channelKey/:id/comments` | Add a comment to a post |

### Tasks / Kanban — `/api/tasks`
| Method | Path | Description |
|---|---|---|
| GET | `/:channelKey` | List tasks for a channel, grouped client-side by `status` |
| POST | `/:channelKey` | Create a task `{title, description, status, priority, assignee_id, due_date}` |
| PUT | `/:channelKey/:id` | Update a task (also used for drag-and-drop status changes) |
| DELETE | `/:channelKey/:id` | Delete a task |

### Documents — `/api/documents`
| Method | Path | Description |
|---|---|---|
| GET | `/:channelKey` | List documents in a vault channel |
| POST | `/:channelKey` | Add a document `{title, description, doc_type, url, version, status}` |
| PUT | `/:channelKey/:id` | Update a document entry |
| DELETE | `/:channelKey/:id` | Delete a document entry |

### Stage Gates — `/api/gates`
| Method | Path | Description |
|---|---|---|
| GET | `/:channelKey` | List gates with vote tallies, the caller's own vote, and a `canVote` flag (true if caller's role is in that channel's `gateApprovers`) |
| POST | `/:channelKey` | Create a gate item to be voted on |
| POST | `/:channelKey/:id/vote` | Cast/replace a vote — `{decision: 'approve'|'reject'|'abstain'}`, upserted via `ON CONFLICT(gate_id, user_id)` |
| POST | `/:channelKey/:id/resolve` | Finalize the gate as approved/rejected (eligible voters/admin only) |

### Events — `/api/events`
| Method | Path | Description |
|---|---|---|
| GET | `/:channelKey` | List events split into upcoming/past, with RSVP counts and the caller's own RSVP |
| POST | `/:channelKey` | Create an event |
| POST | `/:channelKey/:id/rsvp` | Upsert the caller's RSVP — `{status: 'going'|'interested'|'declined'}` |
| DELETE | `/:channelKey/:id` | Delete an event |

### Roadmap — `/api/roadmap` (write restricted to `leadership`/admin)
| Method | Path | Description |
|---|---|---|
| GET | `/` | List all roadmap items, grouped by quarter |
| POST | `/` | Create a roadmap item |
| PUT | `/:id` | Update a roadmap item |
| DELETE | `/:id` | Delete a roadmap item |

### Jobs — `/api/jobs` (write restricted to `leadership`/`core`/`eir`/admin)
| Method | Path | Description |
|---|---|---|
| GET | `/` | List open roles |
| POST | `/` | Post a new role |
| PUT | `/:id` | Update a posting |
| DELETE | `/:id` | Delete a posting |

### Ventures / Portfolio Hubs — `/api/ventures`
| Method | Path | Description |
|---|---|---|
| GET | `/` | List ventures visible to the caller |
| GET | `/dealflow` | Filterable dealflow list (by stage) — investor/leadership/core view |
| GET | `/:slug/members` | List a venture's team members |
| POST | `/` | 🔒 Admin/Leadership — create a venture (auto-generates `slug`, seeds the 4 standard sub-channels conceptually via `PORTFOLIO_SUBCHANNELS`) |
| PUT | `/:slug` | Update venture details |
| POST | `/:slug/members` | Add a team member to a venture (grants them access to its private hub) |
| DELETE | `/:slug/members/:userId` | Remove a team member |
| DELETE | `/:slug` | Delete a venture and its hub |
| GET | `/:slug/metrics` | Monthly metrics history for one venture |
| POST | `/:slug/metrics` | Upsert a month's metrics `{month, mrr, burn, runway, growth_pct, headcount}` |
| GET | `/dashboard/summary` | Consolidated latest-month metrics across all ventures (for the Metrics Dashboard channel) |

### Directory — `/api/directory`
| Method | Path | Description |
|---|---|---|
| GET | `/users` | Lightweight `{id, display_name}` list for dropdowns (assignee pickers, member pickers) |
| GET | `/profiles` | Full people directory: roles, skills, bio, title — searchable client-side |
| PUT | `/profile` | Self-service — update the caller's own profile fields |

## 7. Frontend File Map

| File | Responsibility |
|---|---|
| `public/static/helpers.js` | Pure utility functions: HTML escaping, date formatting, avatar/badge HTML generators, toast notifications, DOM query shorthands. No app state. |
| `public/static/api.js` | The single `API` object — every backend call goes through here (thin Axios wrappers). No other file calls `axios` directly. |
| `public/static/login.js` | Renders and wires the login form; on success, stores the user in `AppState` and calls `bootApp()`. |
| `public/static/app.js` | The application shell: `AppState` (global mutable state), `bootApp()`, sidebar rendering (`renderSidebarNav`), the `navigateTo()`/`renderMainContent()` router that dispatches to the correct `views_*.js` renderer based on the channel's `type`. |
| `public/static/views_discussion.js` | Renders discussion boards, announcement feeds, and the static Rules page. |
| `public/static/views_kanban.js` | Renders Kanban boards with native HTML5 drag-and-drop between status columns; task create/edit modal. |
| `public/static/views_documents.js` | Document vault grid + add/edit modal. |
| `public/static/views_gates.js` | Stage-Gate voting cards with live tally progress bars and approve/reject/abstain controls. |
| `public/static/views_events.js` | Events calendar (upcoming/past split) + RSVP buttons + create modal. |
| `public/static/views_directory.js` | Searchable people directory grid + self-profile editor. |
| `public/static/views_jobs.js` | Open Studio Roles board. |
| `public/static/views_roadmap.js` | Quarterly roadmap timeline view. |
| `public/static/views_investor.js` | Dealflow board (filterable by venture stage) and the consolidated Metrics Dashboard. |
| `public/static/admin_panel.js` | The full Admin Panel: user table with multi-role checkboxes, create/edit/reset-password/deactivate modals, venture creation and team-membership management. |

There is intentionally **no client-side security logic** beyond hiding UI the user can't use — every mutating action still goes through the server-side checks described in §2 and §3.

## 8. Local Development Cheatsheet

```bash
cd webapp
npm install                                   # first time only
npm run build                                 # vite build → dist/
pm2 start ecosystem.config.cjs                # runs `wrangler pages dev dist --d1=ncfvs-production --local`
npm run db:migrate:local                      # first time only — creates local SQLite + seeds admin/roles
curl http://localhost:3000                    # sanity check
pm2 logs --nostream                           # check logs without blocking
npm run db:reset                              # wipe local D1 + re-apply migrations (clean slate)
```

## 9. Known Placeholders to Replace Before Production

| Location | Placeholder | Replace with |
|---|---|---|
| `wrangler.jsonc` → `d1_databases[0].database_id` | `"local-placeholder-id"` | The real UUID from `npx wrangler d1 create ncfvs-production` |
| Worker secret `JWT_SECRET` | Not set (falls back to `DEV_SECRET` in `src/middleware/auth.ts`) | A long random string via `npx wrangler pages secret put JWT_SECRET` |
| Admin password | Seeded default `ncfvs` | Change via Admin Panel → Reset Password immediately after first production login |

See `docs/HOSTINGER_DEPLOYMENT.md` for the full deployment + domain-connection walkthrough.
