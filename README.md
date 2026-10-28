# Personal Portfolio — Pawan Chaudhary

A dark, editorial-style personal portfolio for a full-stack developer, paired with a private
admin dashboard that manages every piece of content in the site. The public page is plain
HTML, CSS and JavaScript; the content behind it lives in PostgreSQL and is served by an
Express + Prisma API.

The design is the source of truth: the homepage layout never changes when content is edited.
Only text and cards fill in from the database, and static markup stays visible whenever the
API is unavailable.

---

## Table of contents

- [Screenshots](#screenshots)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Available scripts](#available-scripts)
- [API reference](#api-reference)
- [Content model](#content-model)
- [How the public page stays identical](#how-the-public-page-stays-identical)
- [Roles and security](#roles-and-security)
- [Design specs](#design-specs)
- [Known limitations](#known-limitations)

---

## Screenshots

Each row pairs the public page with the dashboard view that edits it. Both sides come from the
same running application, captured at 1440×900 in the default dark theme — nothing is mocked
up or hand-drawn.

| Public portfolio | Admin dashboard |
| --- | --- |
| **Home — hero**<br>![Home page with hero section](docs/screenshots/public-home.png) | **Overview**<br>![Admin dashboard overview](docs/screenshots/admin-overview.png) |
| **About**<br>![About section of the homepage](docs/screenshots/public-about.png) | **About editor**<br>![About editor in Site settings](docs/screenshots/admin-about-editor.png) |
| **Skills**<br>![Skills section of the homepage](docs/screenshots/public-skills.png) | **Skills manager**<br>![Skills manager in the admin dashboard](docs/screenshots/admin-skills.png) |

- **Home / Overview** — the hero pulls its headline, summary and education meta from the API; the
  overview shows the signed-in role, the server-side session check and quick access to each
  collection.
- **About / About editor** — both sides read the same `SiteSetting` record, so a save in Site
  settings changes the paragraph copy on the next reload.
- **Skills / Skills manager** — skill categories drive the public cards. The manager is captured in
  its empty state on purpose: until a category has at least one visible skill, the homepage keeps
  its three designed cards, so it never looks broken while content is being set up.

---

## Features

### Public site (`frontend/index.html`)

- **Hero** — headline, name and summary come from the portfolio profile; the
  EDUCATION / CLASSIFICATION row comes from the first published education record.
- **About** — heading, two paragraphs and three focus items are editable through site settings.
- **Skills** — categories render as numbered cards with a glyph, description and skill tags.
- **Projects** — published projects render as cards with technologies and repository/live links.
- **Experience** — published roles render as a timeline.
- **Education** — published qualifications render as a list.
- **Certifications** — published certifications with issuer and credential details.
- **Contact** — email and GitHub call-to-action buttons.
- Theme toggle (light/dark, persisted), mobile navigation, scroll-spy nav, reveal animations,
  back-to-top button and reduced-motion support.

### Admin dashboard (`frontend/admin/index.html`)

- Session-based login with rate limiting, CSRF protection and role checks.
- **Profile** — full name, headline, summary, contact details, social URLs, images, SEO fields.
- **Projects** — full CRUD with search, status filter, technologies, featured flag, ordering
  and draft/published/archived workflow.
- **Experience**, **Education**, **Certifications** — full CRUD with validation, ordering and
  publication status.
- **Skills** — manage categories (name, description, order) and skills (name, proficiency,
  order, visibility) with delete confirmations.
- **Site settings** — About section editor (heading, paragraphs, three focus items, image label).
- Loading, empty, error and retry states throughout; every destructive action asks for
  confirmation.

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | HTML5, CSS3, vanilla JavaScript (no build step) |
| Backend | Node.js, Express 5, TypeScript (CommonJS, NodeNext) |
| ORM / database | Prisma 7 (`prisma-client` generator + `@prisma/adapter-pg`), PostgreSQL |
| Validation | Zod |
| Auth | `express-session` + `connect-pg-simple`, `argon2` password hashing |
| Security | `csrf-sync`, `helmet`, `cors`, `express-rate-limit`, `otplib` (2FA fields) |
| Tooling | `tsx` (dev watch), `tsc` (typecheck + build) |

---

## Project structure

```
final-portfolio/
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   └── schema.prisma          # All models and enums
│   ├── scripts/
│   │   └── create-owner.ts        # One-time owner account bootstrap
│   ├── src/
│   │   ├── config/                # Prisma client, session, CSRF, About defaults
│   │   ├── middlewares/
│   │   │   └── require-admin.ts   # requireAdmin / requireRole
│   │   ├── routes/
│   │   │   ├── auth.ts            # login, me, logout
│   │   │   ├── csrf.ts            # CSRF token endpoint
│   │   │   ├── admin.ts           # admin auth check
│   │   │   ├── content.ts         # Admin CRUD for all content
│   │   │   ├── public.ts          # Read-only public content
│   │   │   └── health.ts          # Database health check
│   │   ├── types/
│   │   └── server.ts              # App bootstrap, CORS, middleware order
│   ├── prisma7.config.ts
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── admin/
│   │   ├── index.html             # Dashboard shell
│   │   └── login.html             # Admin login
│   ├── assets/
│   │   ├── css/
│   │   │   ├── style.css
│   │   │   ├── admin.css
│   │   │   └── portfolio-animations.css
│   │   └── js/
│   │       ├── script.js          # Public page behaviour + content loaders
│   │       ├── admin.js           # Dashboard views, forms, API client
│   │       └── portfolio-animations.js
│   ├── index.html
│   └── favicon.svg
├── docs/
│   └── screenshots/               # Images used in this README
├── home.md / about.md / skills.md # Design + implementation specs
└── home.png / about.png / skills.png
```

---

## Getting started

### Prerequisites

- Node.js 20 or newer (developed on Node 24)
- PostgreSQL (14 or newer recommended)
- A static file server for the frontend — the site has no build step

### 1. Backend

```bash
cd backend
npm install
```

Create `backend/.env` (see [Environment variables](#environment-variables)), then apply the
schema and generate the Prisma client:

```bash
npx prisma migrate deploy
npx prisma generate
```

`migrate deploy` applies the existing migrations without resetting data. Never use
`prisma migrate reset` on a database that already holds portfolio content.

Create the first admin account (only works when no admin exists yet):

```bash
OWNER_EMAIL=you@example.com \
OWNER_PASSWORD='a-strong-password-of-at-least-12-chars' \
OWNER_NAME='Your Name' \
npx tsx scripts/create-owner.ts
```

Start the API in watch mode:

```bash
npm run dev
```

The API listens on `http://localhost:4000` by default.

Verify it:

```bash
curl http://localhost:4000/api/health
curl http://localhost:4000/api/health/database
```

### 2. Frontend

```bash
cd frontend
python3 -m http.server 5500
# or: npx serve -l 5500
```

- Public site: <http://localhost:5500/>
- Admin dashboard: <http://localhost:5500/admin/login.html>

Log in with the account created in the previous step.

> **The frontend must be served over HTTP.** Double-clicking `frontend/admin/login.html`
> cannot work: a `file://` page has a `null` origin, so the API blocks its requests and the
> session cookie cannot persist. The dashboard detects this and shows the command to run.

> CORS: in development the API accepts any origin, so Live Server, Vite, the IPv6 loopback, a
> phone on the same network and port-forwarded preview URLs all work without configuration
> (mutations still need a session and a CSRF token). With `NODE_ENV=production` only
> `FRONTEND_ORIGIN` is trusted — add your deployed domain there before going live.

### 3. Production build

```bash
cd backend
npm run typecheck
npm run build
NODE_ENV=production node dist/src/server.js
```

Serve `frontend/` with any static host. In production, cookies are `secure`, so the site must
be served over HTTPS, and the frontend's API base URLs must point at the deployed API (see
[Known limitations](#known-limitations)).

---

## Environment variables

All backend variables live in `backend/.env` (git-ignored) and are loaded with `dotenv`.

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string used by Prisma, the session store and the health check. |
| `SESSION_SECRET` | Yes | Session signing secret. Must be at least 32 characters or the server refuses to start. |
| `PORT` | No | API port. Defaults to `4000`. |
| `FRONTEND_ORIGIN` | No | Comma-separated list of allowed browser origins, e.g. `https://example.com,https://www.example.com`. Defaults to `http://localhost:5173`. |
| `NODE_ENV` | No | Set to `production` to enable `secure` session cookies. |
| `OWNER_EMAIL` | Create-owner only | Email for the bootstrap admin. |
| `OWNER_PASSWORD` | Create-owner only | 12–128 characters. Hashed with Argon2id. |
| `OWNER_NAME` | Create-owner only | Display name for the bootstrap admin. |

Example `backend/.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/portfolio?schema=public"
SESSION_SECRET="replace-with-a-random-string-of-at-least-32-characters"
PORT=4000
FRONTEND_ORIGIN="http://localhost:5173"
```

---

## Available scripts

Run from `backend/`:

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the API with `tsx watch` (auto-restart on change). |
| `npm run typecheck` | `tsc --noEmit` — type checks without emitting. |
| `npm run build` | Compiles TypeScript to `dist/`. |
| `npm start` | Runs the compiled server (see [Known limitations](#known-limitations)). |
| `npm test` | Placeholder — no automated test suite yet. |

Prisma commands are run through `npx`:

```bash
npx prisma migrate deploy   # apply pending migrations
npx prisma migrate status   # check migration state
npx prisma generate         # regenerate the typed client
npx prisma studio           # optional database browser
```

---

## API reference

Base URL: `http://localhost:4000/api`. All responses are JSON and include `success: true`
(the error middleware returns `{ "error": "..." }`).

### Health

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/health` | Liveness check. |
| `GET` | `/health/database` | Executes `SELECT 1`; returns `503` when the database is unreachable. |

### Authentication

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/auth/csrf-token` | Issues/returns the CSRF token for this session. |
| `POST` | `/auth/login` | Body: `{ email, password }`. Rate limited to 10 attempts per 15 minutes. |
| `GET` | `/auth/me` | Current admin (or `401`). |
| `POST` | `/auth/logout` | Destroys the session. |
| `GET` | `/admin/check` | Verifies session and role. |

State-changing requests (`POST`, `PUT`, `PATCH`, `DELETE`) must send the token from
`GET /api/auth/csrf-token` in the `x-csrf-token` header. The dashboard's `api()` helper does
this automatically.

### Public (read-only, no auth)

| Method | Endpoint | Returns |
| --- | --- | --- |
| `GET` | `/public/profile` | `profile` (or `null`) and `educationMeta` from the first published education record. |
| `GET` | `/public/about` | About content, merged with defaults for any missing key. |
| `GET` | `/public/skills` | Categories with their visible skills, ordered by `sortOrder`. |
| `GET` | `/public/projects` | Published projects. |
| `GET` | `/public/experience` | Published work experience. |
| `GET` | `/public/education` | Published education records. |
| `GET` | `/public/certifications` | Published certifications. |

All public endpoints send `Cache-Control: no-store`.

### Admin content (session + role required)

Read and write are allowed for `OWNER`, `ADMIN` and `EDITOR`; deletes are `OWNER` and
`ADMIN` only.

| Resource | Endpoints |
| --- | --- |
| Profile | `GET /admin/profile`, `PUT /admin/profile` |
| Projects | `GET /admin/projects` (search, status, pagination), `GET/POST /admin/projects`, `GET/PUT/DELETE /admin/projects/:id` |
| Experience | `GET /admin/experience`, `GET/POST /admin/experience`, `GET/PUT/DELETE /admin/experience/:id` |
| Education | `GET /admin/education`, `GET/POST /admin/education`, `GET/PUT/DELETE /admin/education/:id` |
| Certifications | `GET /admin/certifications`, `GET/POST /admin/certifications`, `GET/PUT/DELETE /admin/certifications/:id` |
| Skill categories | `GET/POST /admin/skill-categories`, `PUT/DELETE /admin/skill-categories/:id` |
| Skills | `GET/POST /admin/skills`, `PUT/DELETE /admin/skills/:id` |
| About settings | `GET /admin/settings/about`, `PUT /admin/settings/about` |

Validation errors return `400` with per-field issues, duplicate names return `409`, missing
records return `404`, and unauthenticated requests return `401`.

---

## Content model

Defined in `backend/prisma/schema.prisma`:

| Model | Purpose |
| --- | --- |
| `AdminUser` / `AdminSession` | Dashboard accounts and server-side sessions. |
| `PortfolioProfile` | Hero identity: name, headline, summary, contact details, social URLs, SEO. |
| `Project` | Case studies with technologies, links, featured flag and ordering. |
| `WorkExperience` | Timeline entries. |
| `Education` | Qualifications; the first published record feeds the hero meta row. |
| `Certification` | Credentials and issuers. |
| `SkillCategory` / `Skill` | Grouped skills; `Skill.isVisible` controls public display. |
| `SiteSetting` | JSON settings keyed by name (currently `about`). |
| `ContactMessage` | Stored contact submissions (model only — no route yet). |
| `MediaAsset` | Upload metadata (model only — no upload endpoint yet). |
| `AuditLog` | Admin action trail with severity levels. |

`Project`, `WorkExperience`, `Education` and `Certification` share the `ContentStatus` enum
(`DRAFT`, `PUBLISHED`, `ARCHIVED`). Only `PUBLISHED` rows are exposed by `/api/public/*`.

---

## How the public page stays identical

The homepage is progressive enhancement, not client-side rendering:

- `frontend/index.html` contains the full designed markup with stable ids on the text nodes.
- `frontend/assets/js/script.js` fetches each public endpoint and replaces text in place,
  only where a non-empty value exists. Classes, structure and styling are never touched.
- If a request fails, the static content remains. The About section falls back to the
  defaults in `backend/src/config/about-defaults.ts`.
- The skills grid only replaces the three static cards once at least one category has a
  visible skill; otherwise the original cards stay.
- All API-provided text is HTML-escaped before insertion.

---

## Roles and security

- Passwords are hashed with Argon2id; login is rate limited per IP.
- Sessions are stored in PostgreSQL (`session` table), expire after 8 hours and roll on
  activity. Cookies are `httpOnly`, `sameSite=lax`, and `secure` in production.
- Every mutating request requires a CSRF token; failures return `403 EBADCSRFTOKEN`.
- `requireAdmin` re-validates the session row against the database on every request, so
  deactivating an admin instantly revokes access.
- `helmet` sets security headers; `x-powered-by` is disabled.
- Admin accounts with `twoFactorEnabled` are blocked at login until a 2FA flow is wired up.

---

## Design specs

The `home.md`, `about.md` and `skills.md` files document, section by section, how each design
reference (`home.png`, `about.png`, `skills.png` at the repository root) maps to markup,
styling, admin fields and API endpoints. They are the reference to consult before changing
those sections; the screenshots in this README show the implemented result.

---

## Known limitations

- **The API base URL follows the page hostname** (`http(s)://<page-host>:4000/api`) in both
  `frontend/assets/js/admin.js` and `frontend/assets/js/script.js`, so `localhost` and `127.0.0.1`
  both work and the session cookie stays first-party. When the frontend is deployed on a different
  host, set `window.PORTFOLIO_API_BASE` before the scripts load.
- **`npm start` points at `dist/server.js`**, while the compiler emits `dist/src/server.js`.
  Run `node dist/src/server.js` until the script is corrected.
- **Contact messages and audit log** appear in the dashboard navigation but are placeholders;
  the `ContactMessage` and `AuditLog` models exist without routes. The public contact section
  uses `mailto:` links, so no message is stored.
- **No automated tests yet** — verification is done with `npm run typecheck`, `npm run build`
  and live API checks.
- **Images are URL-based** (`profileImage`, `imageUrl`); there is no upload endpoint, so media
  must be hosted elsewhere.

---

## Author

**Pawan Chaudhary** — Full Stack Developer
[GitHub](https://github.com/pawan-chaudhary-70056) · [Email](mailto:mpss70056@gmail.com)
