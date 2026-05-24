![Spot On! logo](https://cdn.discordapp.com/attachments/1150911489104936991/1476621144613191710/Spot_On1.png?ex=69a1ca1b&is=69a0789b&hm=751c235d32fda0dc3b1103660c3c29bc6697d18abbf9fb50958aa38ddf0d3b7c&)

A real-time campus library study space management system that helps students find, reserve, and collaboratively occupy study spaces with seamless QR code check-in functionality.

## Overview

Spot On! is a modern web application designed to solve the common problem of finding available study spaces in busy campus libraries. Students can view real-time availability, check in using QR codes, join other students' sessions, earn achievement badges, and report misuse — all while library staff can efficiently monitor space utilization.

## Features

- **Real-time Availability Tracking** — View current occupancy status of all study spaces across floors
- **Interactive Floor Plan** — Zoomable/pannable visual floor plan with space markers and detail panels
- **QR Code Check-in** — Quick, contactless check-in via per-space rotating QR codes
- **Session Management** — Start, join, extend, or check out of study sessions
- **Join Requests** — Request to join an existing session; host can approve or reject
- **Session Expiry & Auto-checkout** — Scheduled jobs (node-cron) enforce session time limits
- **Reporting System** — Report occupied spaces and have peers confirm reports
- **Notifications** — In-app notification bell with email delivery via Resend/Nodemailer
- **Leaderboard** — Community ranking based on study session activity
- **Badges & Gamification** — Achievement badges awarded automatically for milestones
- **User Profiles** — Personal profile cards showing session history and badges
- **Library Hours Enforcement** — Check-in blocked outside library operating hours
- **API Documentation** — Interactive Swagger UI at `/api-doc`
- **User Authentication** — Secure login restricted to `@ualg.pt` email addresses

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Database | PostgreSQL 17 |
| ORM | Prisma 6 |
| Authentication | NextAuth.js v4 |
| Styling | Tailwind CSS v4 |
| Email | Resend / Nodemailer |
| QR Scanning | html5-qrcode |
| QR Generation | qrcode.react |
| Floor Plan | react-zoom-pan-pinch |
| Scheduled Jobs | node-cron |
| API Docs | next-swagger-doc + swagger-ui-react |
| Containerisation | Docker + Docker Compose |
| Testing | Jest (unit + integration) |

## Prerequisites

- [Docker](https://www.docker.com/) and Docker Compose
- [Git](https://git-scm.com/)

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/LES2526/SpotOn
cd SpotOn/spot-on
```

### 2. Configure environment variables

Copy `.env` and fill in your values:

```bash
cp .env .env.local
```

Required variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_URL` | Public URL of the app |
| `NEXTAUTH_SECRET` | Random secret for NextAuth |
| `QR_SECRET` | Secret used to sign QR tokens |
| `ALLOWED_EMAIL_DOMAIN` | Accepted email domain (e.g. `ualg.pt`) |
| `ALLOW_ANY_EMAIL_IN_DEV` | Set `true` to skip domain check in dev |
| `EMAIL_SERVER_HOST` | SMTP host |
| `EMAIL_SERVER_PORT` | SMTP port |
| `EMAIL_SERVER_USER` | SMTP username |
| `EMAIL_SERVER_PASSWORD` | SMTP password |
| `EMAIL_FROM` | Sender address for notification emails |
| `LIBRARY_CLOSING_TIME` | Closing time in `HH:MM` (24h) format |

### 3. Start the project

```bash
docker compose up
```

This automatically runs migrations (`prisma db push`), seeds the database, and starts the dev server.

Visit [http://localhost:3000](http://localhost:3000).

### 4. (Optional) Run database migrations manually

```bash
npx prisma migrate dev
npx prisma generate
npx prisma db seed
```

## Project Structure

```
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
├── postman/                  # Postman test seed script
├── prisma/                   # Schema, migrations, seed
├── public/                   # Static assets
├── compose.yaml              # Docker Compose
├── Dockerfile
└── ...                       # Config files (eslint, jest, tsconfig, etc.)
```

## Database Schema

### NextAuth.js Models

| Model | Purpose |
|---|---|
| `User` | Students and staff; restricted to `@ualg.pt` emails |
| `Account` | OAuth / credential provider links per user |
| `Session` | Active login sessions |
| `VerificationToken` | Magic-link tokens for passwordless login |

### Spot-On Domain Models

| Model | Purpose |
|---|---|
| `FloorPlan` | Library floor images with coordinate metadata |
| `Space` | Physical study space with QR token, capacity, and amenities |
| `StudySession` | Active or completed session in a space |
| `UserOnStudySession` | Participant list (host flag, join timestamp) |
| `JoinRequest` | Pending / approved / rejected requests to join a session |
| `Report` | Occupancy abuse reports filed against a session |
| `ReportConfirmation` | Peer confirmations of a report |
| `Notification` | In-app and email notification records |
| `Badge` | Achievement badge definitions |
| `UserBadge` | Badges earned by users |

### Key Enums

| Enum | Values |
|---|---|
| `SessionStatus` | `ACTIVE`, `COMPLETED`, `OVERDUE` |
| `JoinRequestStatus` | `PENDING`, `APPROVED`, `REJECTED` |
| `ReportStatus` | `OPEN`, `RESOLVED`, `DISMISSED` |
| `NotificationType` | join-request, session events, reports, … |
| `NotificationStatus` | `PENDING`, `SENT` |
| `SpaceType` | room types (e.g. individual, group) |
| `SpaceShape` | shape metadata used by the floor plan renderer |

### Relationship Summary

```
User (1) ──── (M) Account
User (1) ──── (M) Session
User (1) ──── (M) StudySession [as host]
User (M) ──── (M) StudySession [via UserOnStudySession]
User (1) ──── (M) JoinRequest
User (1) ──── (M) Notification
User (M) ──── (M) Badge [via UserBadge]

Space (1) ──── (M) StudySession
FloorPlan (1) ──── (M) Space

StudySession (1) ──── (M) JoinRequest
StudySession (1) ──── (M) Report

Report (1) ──── (M) ReportConfirmation
```

To browse data interactively:

```bash
npx prisma studio
```

## Testing

```bash
# Run all tests
npm run test

# Watch mode
npm run test:watch
```

Tests live in `__tests__/unit/` (fast, no DB) and `__tests__/integration/` (require a running database).

## API Documentation

Interactive Swagger UI is available at [http://localhost:3000/api-doc](http://localhost:3000/api-doc) when the dev server is running.

## Team

- **André Martins** — [GitHub](https://github.com/V1zinho)
- **António Matoso** — [GitHub](https://github.com/Matoso-dev)
- **Tomás Machado** — [GitHub](https://github.com/Machado65)
- **Vasco Hilário** — [GitHub](https://github.com/PartyOnTheBeat)

## Acknowledgments

- Thanks to the campus library staff for their input
- Built with [Next.js](https://nextjs.org/)
- Database powered by [PostgreSQL](https://www.postgresql.org/)
- ORM by [Prisma](https://www.prisma.io/)

## License

This project is licensed under the MIT License — see the LICENSE file for details.
