# Spot On

> **Find, reserve and share study spaces in your campus library — in real time**

A modern web app that lets students view live occupancy, check in via QR codes, collaborate in study sessions, earn badges, and report misuse — while library staff get a clear view of how their space is being used.

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Prerequisites](#prerequisites)
5. [Quick Start](#quick-start)
6. [Environment Variables](#environment-variables)
7. [Sign-in & Mobile Access](#sign-in--mobile-access)
8. [Demo Walkthrough](#demo-walkthrough)
9. [Running the Project](#running-the-project)
    - [Option A — Makefile (recommended)](#option-a--makefile-recommended)
    - [Option B — Docker Compose (manual)](#option-b--docker-compose-manual)
    - [Option C — Local Node.js (manual)](#option-c--local-nodejs-manual)
    - [Option D — Deploy to Railway (optional)](#option-d--deploy-to-railway-optional)
10. [Database Workflow](#database-workflow)
11. [Testing](#testing)
12. [API Documentation](#api-documentation)
13. [Project Structure](#project-structure)
14. [Architecture & Diagrams](#architecture--diagrams)
15. [Team](#team)
16. [Acknowledgments](#acknowledgments)
17. [License](#license)

---

## Overview

**Spot On!** solves a common campus problem: finding an available study space when the library is busy. Students see real-time occupancy across all floors, check into a space with a QR code, invite peers into a shared session, and earn achievement badges. Library staff get visibility into utilisation and a community-driven reporting flow for misuse.

The application is built on **Next.js 16** with the App Router, **PostgreSQL** + **Prisma**, and **NextAuth** for authentication restricted to the `@ualg.pt` domain.

---

## Features

### Discovery & check-in

- **Real-time availability** across all floors of the library
- **Interactive floor plan** with zoom, pan and clickable space markers
- **QR check-in** via per-space rotating tokens (contactless)

### Sessions & collaboration

- **Session management** — start, join, extend or check out
- **Join requests** — host approves or rejects incoming requests
- **Auto-checkout** — scheduled `node-cron` jobs enforce session limits
- **Library hours enforcement** — check-in blocked outside operating hours

### Community

- **Reports** for occupied/abandoned spaces, with peer confirmations
- **Notifications** — in-app bell + transactional emails via **Resend**
- **Leaderboard** ranking by study activity
- **Badges & gamification** — milestones unlocked automatically
- **User profiles** with session history and earned badges

### Tooling

- **Interactive API docs** via Swagger UI at [`/api-doc`](http://localhost:3000/api-doc)
- **Secure auth** with `@ualg.pt` domain restriction

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Database | PostgreSQL 17 |
| ORM | Prisma 6 |
| Auth | NextAuth.js v4 |
| Styling | Tailwind CSS v4 |
| Transactional email | [Resend](https://resend.com) |
| QR scanning | html5-qrcode |
| QR generation | qrcode.react |
| Floor plan | react-zoom-pan-pinch |
| Scheduled jobs | node-cron |
| API docs | next-swagger-doc + swagger-ui-react |
| Containers | Docker + Docker Compose |
| Testing | Jest (unit + integration) · Postman + Newman (E2E) |
| Deployment | Railway · Docker |

---

## Prerequisites

| Tool | Used for | Required? |
| --- | --- | --- |
| [Git](https://git-scm.com/) | Cloning the repository | Always |
| [Docker](https://www.docker.com/) + Docker Compose | Containers (Postgres + web) | Always |
| [GNU Make](https://www.gnu.org/software/make/) | One-command setup (Option A) | Recommended |
| [Node.js 20+](https://nodejs.org/) & `npm` | Host-side Node dev (Option C) | Optional |
| [Railway CLI](https://docs.railway.app/develop/cli) | Cloud deployment (Option D) | Optional |

---

## Quick Start

**1.** Clone the repository and enter the app folder:

```bash
git clone https://github.com/LES2526/SpotOn
cd SpotOn/spot-on
```

**2.** Bring the whole stack up with a single command:

```bash
make docker-recreate
```

Open [http://localhost:3000](http://localhost:3000) — you should see the landing page. The stack rebuilds the images, starts Postgres + the web service, waits until the app responds, applies the schema, seeds the database, and tails the logs.

A working [`spot-on/.env`](spot-on/.env) is already committed with sensible local-dev defaults, so there's no file to copy. Don't have `make`? Jump to [Option B](#option-b--docker-compose-manual) for the equivalent raw `docker compose` commands.

> **Before you sign in or use the app on your phone, set `NEXTAUTH_URL` correctly** — see [Sign-in & Mobile Access](#sign-in--mobile-access) below. The repo ships with a placeholder IP that won't match your network.

---

## Environment Variables

A ready-to-run [`spot-on/.env`](spot-on/.env) is committed with sensible defaults, so the stack boots without you touching anything.

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_URL` | Public URL of the app — must match the address your browser hits (see [Sign-in & Mobile Access](#sign-in--mobile-access)) |
| `NEXTAUTH_SECRET` | Random secret for NextAuth — generate with `openssl rand -base64 32` |
| `QR_SECRET` | Shared HMAC key used to sign rotating QR tokens |
| `ALLOWED_EMAIL_DOMAIN` | Accepted login domain (e.g. `ualg.pt`) |
| `ALLOW_ANY_EMAIL_IN_DEV` | Set `true` to skip the domain check in development |
| `RESEND_API_KEY` | API key from your [Resend](https://resend.com) account — required for magic-link sign-in and notification emails to actually deliver |
| `EMAIL_FROM` | Sender address shown in outgoing emails (must be a verified domain in Resend) |
| `LIBRARY_CLOSING_TIME` | Library closing time in `HH:MM` (24h) format — caps `expectedEndTime` |
| `BYPASS_HOURS_CHECK` | Set `true` to skip library opening-hours enforcement during development |

> **Where to change a value:** for the **Docker** workflow, edit [`spot-on/.env`](spot-on/.env) directly. The single exception is `NEXTAUTH_URL`, which is also pinned in [`compose.yaml`](spot-on/compose.yaml) and must be updated there — covered in the next section. For the **local Node** workflow (Option C), you can additionally create a git-ignored `spot-on/.env.local` for personal secrets; Next.js merges it on top of `.env` automatically. After any change to `.env` or `compose.yaml`, run `make docker-recreate` so the container picks it up.

---

## Sign-in & Mobile Access

NextAuth builds magic-link callbacks from `NEXTAUTH_URL`. If that URL doesn't match the address your browser is actually hitting, sign-in will appear to succeed but the callback will fail. The repo ships with a placeholder (`http://192.168.1.4:3000`) that almost certainly isn't your IP, so this needs to be set once before logging in.

Pick the scenario that matches you.

### Scenario 1 — Desktop only (no phone)

If you only need the app on the same machine you're running it on:

**1.** In [`compose.yaml`](spot-on/compose.yaml), change `NEXTAUTH_URL` to `localhost`:

```yaml
environment:
  NEXTAUTH_URL: http://localhost:3000
```

**2.** In [`spot-on/.env`](spot-on/.env), set the same value (kept in sync so Option C also works):

```bash
NEXTAUTH_URL=http://localhost:3000
```

**3.** Recreate the stack:

```bash
make docker-recreate
```

Open [http://localhost:3000](http://localhost:3000) and sign in.

### Scenario 2 — Use the app on your phone (QR codes)

The phone and the host must be on the **same Wi-Fi / LAN**.

**1.** Find your host's LAN IP:

```bash
# macOS
ipconfig getifaddr en0

# Linux
hostname -I

# Windows
ipconfig
```

You'll get something like `192.168.1.42` (network range varies).

**2.** In [`compose.yaml`](spot-on/compose.yaml), replace the placeholder IP with yours:

```yaml
environment:
  NEXTAUTH_URL: http://192.168.1.42:3000
```

**3.** In [`spot-on/.env`](spot-on/.env), set the same value:

```bash
NEXTAUTH_URL=http://192.168.1.42:3000
```

**4.** Make sure your firewall lets inbound traffic into port `3000` (macOS: System Settings → Network → Firewall · Linux: `sudo ufw allow 3000` · Windows: Defender → Inbound rules).

**5.** Recreate the stack:

```bash
make docker-recreate
```

On your phone (same Wi-Fi), open `http://<your-ip>:3000` and scan a space's QR code.

> **Deploying to Railway?** Skip all of the above. Railway gives you a public HTTPS URL reachable from any device on any network — set `NEXTAUTH_URL` once to the Railway-provided domain and the phone just works.

---

## Demo Walkthrough

In production, each library space has a physical QR code stuck on it. For local evaluation, the app exposes a **viewer route** that renders the live rotating QR for any space on screen, so you can scan it with your phone as if you were standing in front of the real one.

The full demo needs **one host machine** (running the app) and **two phones** (or two browser profiles) so you can play two different users at once.

### Step 1 — Pick a space and grab its ID

**1.** Make sure the stack is running:

```bash
make docker-up
```

**2.** Open Prisma Studio:

```bash
make prisma-studio
```

Or directly: [http://localhost:5555](http://localhost:5555).

**3.** Open the `Space` table. The seed data ships with a handful of spaces (e.g. study tables on each floor). Copy the `id` value of whichever row you want to demo — it'll look something like `clx1a2b3c4d5e6f7g8h9`.

### Step 2 — Display the QR code on the host machine

On your host browser (laptop/desktop), open the **QR viewer** for the space you just copied:

```text
http://<your-lan-ip>:3000/qrcode/<space-id>
```

Example:

```text
http://192.168.1.42:3000/qrcode/clx1a2b3c4d5e6f7g8h9
```

> The QR shown there is the **same dynamic token** that would appear on a printed sticker in the real library, refreshed automatically. This screen replaces the physical sign for demo purposes.

### Step 3 — Phone 1: check in (host the session)

**1.** Sign in on Phone 1 with **Account A** (an `@ualg.pt` address — or any address if `ALLOW_ANY_EMAIL_IN_DEV=true` in your `.env`). The magic link arrives via Resend.

**2.** From Phone 1, go to `http://<your-lan-ip>:3000` and use the in-app scanner (the **QR icon in the dashboard**), or open the camera app and scan the QR currently displayed on the host browser.

**3.** Phone 1 is now the **host** of an active study session on that space. The space turns "occupied" on the floor plan for everyone else.

### Step 4 — Phone 2: join or report

Phone 2 plays a **second user** (Account B) — a colleague who walks up to the same space and either wants to join or thinks it's being misused.

**1.** Sign in on Phone 2 with **Account B** (a different email from Account A).

**2.** Scan the same QR shown on the host browser, OR open the space directly from the floor plan / dashboard.

You can now demonstrate either flow:

#### Flow A — Request to join the session

- Scanning the QR from a logged-in second account auto-fires a request against `POST /api/spaces/<id>/sessions/join-session`. You'll also see a **Request to join** button in the space's detail panel as a manual entry point.
- A notification arrives on **Phone 1** (the host) via the in-app bell.
- The host taps **Approve** or **Reject**. If approved, Phone 2 is added to the session and the occupant counter on the floor plan goes up by one.
- Phone 2 also receives a notification with the host's decision.

#### Flow B — Report the space (occupancy abuse)

- On Phone 2, open the space's detail panel and tap **Report** — pick a reason (e.g. "table left empty for over an hour").
- The report is now `OPEN` and visible to anyone who opens that space.
- The host (Phone 1) is notified via the bell.

### More flows worth demoing

These build on the same two-phone setup from Steps 1–4. None of them require a fresh stack — just keep playing.

#### Flow C — Extend the session or check out early (host)

- On Phone 1, open the active session panel for the space.
- Tap **Extend** to push `expectedEndTime` forward. The new end time is clamped to `LIBRARY_CLOSING_TIME` so you can't extend past closing.
- Tap **Check out** to end the session manually — the space immediately turns "available" on the floor plan, the host gets points awarded (`calculateCheckoutPoints`), and any joined guests are removed.

#### Flow D — Confirm a report (third user)

This needs a **third user** — open a new incognito window or a third device and sign in as **Account C**.

- Navigate to the space that was reported in Flow B.
- Tap **Confirm report** on the active report shown in the panel.
- Once the confirmation threshold is reached, the host gets escalated notifications and the system can force a checkout. The report transitions toward `RESOLVED`.

#### Flow E — Library closing hours enforcement

The app refuses check-ins outside library opening hours by default.

**1.** In [`spot-on/.env`](spot-on/.env), set `LIBRARY_CLOSING_TIME` to a couple of minutes from now — for example, `15:32` if it's currently 15:30:

```bash
LIBRARY_CLOSING_TIME=15:32
```

**2.** Recreate the stack so the change takes effect:

```bash
make docker-recreate
```

**3.** Before `15:32`, scan a QR — the check-in succeeds but `expectedEndTime` is capped at the closing time. After `15:32`, scan again — the API rejects the request and the UI shows a "library closed" state.

**4.** To bypass this enforcement during regular development, set `BYPASS_HOURS_CHECK=true` in `.env` and recreate.

### Tips for live demos

- **No second phone?** Use two browser profiles (Chrome regular + Chrome incognito, or Chrome + Safari). Magic-link sign-in works identically there.
- **Magic-link not arriving?** Without a valid `RESEND_API_KEY` and a verified `EMAIL_FROM` domain, the email is silently dropped. Either configure Resend properly, or check the **Resend dashboard → Logs** for the magic-link URL and paste it into the browser by hand.
- The **leaderboard** ([`/leaderboard`](http://localhost:3000/leaderboard)) and **profile** ([`/profile`](http://localhost:3000/profile)) pages refresh as sessions complete and badges unlock — a nice closing slide for a demo.
- Auto-checkout runs on a `node-cron` schedule; to demo expiry-based behaviour, either let a short session expire naturally or use Flow E with a near-future `LIBRARY_CLOSING_TIME`.

---

## Running the Project

Four equivalent ways to launch the app — pick the one that fits your environment.

### Option A — Makefile (recommended)

The [`Makefile`](spot-on/Makefile) wraps every common command into a single, named target. **One command** brings the whole stack up:

```bash
make docker-recreate
```

It runs, in order: `docker compose down -v` → `build --no-cache` → `up -d` → waits for the web container to respond → executes `prisma generate` + `prisma db seed` inside it → streams the logs. When it finishes, the app is live at [http://localhost:3000](http://localhost:3000).

**Targets you'll use day to day:**

| Target | What it does |
| --- | --- |
| `make help` | List every available target |
| `make docker-recreate` | Full clean rebuild → up → seed → logs (first run / after schema changes) |
| `make docker-up` | Start the stack (detached) |
| `make docker-down` | Stop the stack and remove volumes |
| `make docker-logs` | Tail container logs |
| `make docker-seed` | Re-run the seed inside the running web container |
| `make test` | Run the Jest test suite once |
| `make test-watch` | Run Jest in watch mode |
| `make lint` / `make lint-fix` | ESLint, read-only or auto-fix |
| `make prisma-studio` | Open Prisma Studio (visual DB browser) |
| `make swagger-open` | Open Swagger UI in your default browser |
| `make postman-ci` | End-to-end Newman run against a clean test DB |

Every target is a thin wrapper over `npm` or `docker compose`, so you can always read the [Makefile](spot-on/Makefile) to see exactly what each one does.

---

### Option B — Docker Compose (manual)

Same outcome as Option A, but typed by hand.

**Full clean rebuild** (equivalent of `make docker-recreate`):

```bash
docker compose down -v
docker compose build --no-cache
docker compose up -d
docker compose logs -f web
```

**Start the stack** (foreground, with live logs):

```bash
docker compose up
```

**Start in the background** (detached):

```bash
docker compose up -d
```

**Stop and wipe the stack** (containers + volumes):

```bash
docker compose down -v
```

**Re-run the database seed** inside the running web container:

```bash
docker compose exec web sh -lc 'npx prisma db seed'
```

> **Note —** the web container's entrypoint already runs `prisma generate`, waits for the DB, applies `prisma db push`, seeds, and then starts `next dev`. You normally don't need to invoke any of those by hand.

---

### Option C — Local Node.js (manual)

Run Next.js directly on your host (faster file-watching on macOS/Windows) and containerise only the database — or skip Docker entirely if you have your own Postgres instance.

**1.** Install dependencies (also triggers `prisma generate` via the `postinstall` hook):

```bash
npm install
```

**2.** Start just the Postgres container (skip if you already have Postgres available):

```bash
docker compose up -d db
```

**3.** Apply the schema and seed the database:

```bash
npx prisma migrate dev
npx prisma db seed
```

**4.** Start the dev server:

```bash
npm run dev
```

**Other day-to-day npm scripts:**

**Build a production bundle:**

```bash
npm run build
```

**Run the production server** (after `build`):

```bash
npm run start
```

**Lint the codebase:**

```bash
npm run lint
```

**Run the Jest test suite:**

```bash
npm run test
```

**Re-run only `prisma/seed.ts`:**

```bash
npm run seed
```

---

### Option D — Deploy to Railway (optional)

The repository ships with a [`railway.toml`](spot-on/railway.toml) so the project can be deployed to [Railway](https://railway.app) with zero extra configuration:

```toml
[deploy]
preDeployCommand = "sh scripts/predeploy.sh"
startCommand = "npm start"
```

[`scripts/predeploy.sh`](spot-on/scripts/predeploy.sh) runs `prisma db push` and the seed script on every deploy so the database stays in sync with the schema.

**Steps:**

**1.** Install the [Railway CLI](https://docs.railway.app/develop/cli):

```bash
npm i -g @railway/cli
```

**2.** Authenticate:

```bash
railway login
```

**3.** Link the local repo to a Railway project (run inside `spot-on/`):

```bash
railway link
```

**4.** Provision a **Postgres** plugin in the Railway dashboard — `DATABASE_URL` is injected automatically.

**5.** Set the remaining environment variables from the [table above](#environment-variables) in the Railway dashboard.

**6.** Deploy:

```bash
railway up
```

> Pushing to the GitHub branch connected to the project triggers an auto-deploy with the same pipeline. The build runs `npm run build` and `npm start` boots the production Next.js server.

---

## Database Workflow

**Apply pending migrations** (development):

```bash
npx prisma migrate dev
```

**Regenerate the Prisma client** (after editing `schema.prisma`):

```bash
npx prisma generate
```

**Re-run the seed script:**

```bash
npx prisma db seed
```

**Open Prisma Studio** (visual DB browser at [http://localhost:5555](http://localhost:5555)):

```bash
npx prisma studio
```

---

## Testing

### Unit & integration (Jest)

Tests live in [`spot-on/__tests__/unit/`](spot-on/__tests__/unit/) (fast, no DB) and [`spot-on/__tests__/integration/`](spot-on/__tests__/integration/) (require a running database).

**Run the full suite once:**

```bash
npm run test
```

**Re-run on every file change** (watch mode):

```bash
npm run test:watch
```

### End-to-end API (Postman + Newman)

**One-shot run** — spins up the test DB + MailHog, migrates, seeds, runs Newman, then tears everything down:

```bash
make postman-ci
```

Prefer to drive the steps yourself? It's four commands.

**1.** Start the test Postgres + MailHog containers:

```bash
make postman-db-up
```

**2.** Apply the Postman test seed (known users/spaces):

```bash
make postman-seed
```

**3.** Run the collection through Newman and emit an HTML report:

```bash
make postman-run
```

**4.** Tear the test stack down:

```bash
make postman-db-down
```

> HTML reports land in [`spot-on/postman/reports/`](spot-on/postman/reports/).

---

## API Documentation

Interactive Swagger UI is available whenever the dev server is running:

→ [http://localhost:3000/api-doc](http://localhost:3000/api-doc)

---

## Project Structure

```text
spot-on/
├── __tests__/
│   ├── integration/          # Integration tests (real DB)
│   └── unit/                 # Unit tests
├── app/
│   ├── api/
│   │   ├── auth/             # NextAuth route handler
│   │   ├── leaderboard/      # GET leaderboard rankings
│   │   ├── notifications/    # GET/PATCH notifications
│   │   ├── qrcode/           # QR code verify & display
│   │   ├── spaces/           # Spaces, sessions, reports
│   │   └── user/             # User badge endpoint
│   ├── api-doc/              # Swagger UI page
│   ├── dashboard/            # Main dashboard page
│   ├── generated/            # Prisma generated client
│   ├── leaderboard/          # Leaderboard page
│   ├── profile/              # User profile page
│   ├── qrcode/               # QR check-in page
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx              # Home / login page
├── components/
│   ├── api-doc/              # ReactSwagger wrapper
│   ├── button/               # Reusable button components
│   ├── dashboard/            # Dashboard header & space panel
│   ├── floor/                # Floor filter selector
│   ├── floor-plan/           # Interactive floor plan view
│   ├── notifications/        # Notification bell
│   ├── occupance/            # Occupancy display
│   ├── profile/              # Profile card
│   ├── providers/            # NextAuth session provider
│   ├── qrcode/               # QR flow state components
│   ├── report/               # Report form
│   ├── space/                # Space card
│   └── study-desk/           # Study desk icon view
├── lib/                      # Shared utilities & business logic
├── postman/                  # Postman collection + Newman setup
├── prisma/                   # Schema, migrations, seed
├── public/                   # Static assets
├── scripts/                  # Deployment helpers (predeploy.sh)
├── compose.yaml              # Docker Compose (dev)
├── compose.test.yaml         # Docker Compose (test DB + MailHog)
├── Dockerfile
├── Makefile                  # Optional shortcuts
├── railway.toml              # Railway deploy config
└── ...                       # eslint, jest, tsconfig, etc.
```

---

## Architecture & Diagrams

High-level documentation lives in [`diagrams/`](diagrams/) and is the source of truth for the domain model and system architecture:

- [`diagrams/class/domain_class_diagram.drawio`](diagrams/class/domain_class_diagram.drawio) — Domain model and entity relationships
- [`diagrams/component/backend_arquitecture.drawio`](diagrams/component/backend_arquitecture.drawio) — Backend component and service architecture

Open the `.drawio` files in [draw.io](https://app.diagrams.net/) or the VS Code Draw.io extension. For the live database shape, browse it interactively with `npx prisma studio` or read [`spot-on/prisma/schema.prisma`](spot-on/prisma/schema.prisma) directly.

---

## Team

| Member | GitHub |
| --- | --- |
| **André Martins** | [@V1zinho](https://github.com/V1zinho) |
| **António Matoso** | [@Matoso-dev](https://github.com/Matoso-dev) |
| **Tomás Machado** | [@Machado65](https://github.com/Machado65) |
| **Vasco Hilário** | [@PartyOnTheBeat](https://github.com/PartyOnTheBeat) |

---

## Acknowledgments

- Campus library staff, for their input throughout development
- [Next.js](https://nextjs.org/) — application framework
- [PostgreSQL](https://www.postgresql.org/) — database
- [Prisma](https://www.prisma.io/) — ORM
- [Resend](https://resend.com/) — transactional email
- [Railway](https://railway.app/) — hosting

---

## License

MIT
