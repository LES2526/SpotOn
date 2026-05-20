# Spot-On — API Testing (Postman + Newman)

End-to-end testing collection for the Spot-On REST API. The tests run against a development server and validate status codes, response schemas, and contracts for each endpoint.

## Content

```text
postman/
├── Spot-On.postman_collection.json   # collection (importable in Postman)
├── Spot-On.postman_environment.json  # environment variables (baseUrl, seed IDs)
├── seed-test.ts                      # deterministic seed for the test DB
└── README.md
```

## How authentication bypass works

The app uses NextAuth with database sessions (cookie). Testing this in Postman would require real login + cookie manipulation. As an alternative, a test mode was added, activated via an environment variable:

- `ENABLE_TEST_AUTH=true` — enables bypass in [require-auth.ts](../lib/require-auth.ts)
- Each request sends the header `X-Test-User-Id: <user-id>` and `requireAuth()` looks for this user directly in the DB
- In production (`ENABLE_TEST_AUTH` undefined), the behavior is normal

The Postman collection automatically injects the header via a *pre-request script* at the root level, using `{{hostUserId}}` by default. Requests that need a different user (e.g., a guest trying to join a session) override the header.

## Prerequisites

- Node.js + npm
- PostgreSQL database for tests (recommended to be separate from the dev DB)
- Newman: `make postman-install` (installs `newman` and `newman-reporter-htmlextra` globally)

## Setup

1. Create a test DB (e.g., `spoton_test`) and point the `DATABASE_URL` to it.

2. Run migrations and regenerate the Prisma client:

   ```bash
   cd spot-on
   DATABASE_URL=postgres://.../spoton_test npx prisma migrate deploy
   npx prisma generate
   ```

3. Apply the test seed (creates users and spaces with deterministic IDs):

   ```bash
   cd spot-on
   DATABASE_URL=postgres://.../spoton_test make postman-seed
   ```

4. Start the server with the auth bypass enabled:

   ```bash
   cd spot-on
   ENABLE_TEST_AUTH=true DATABASE_URL=postgres://.../spoton_test QR_SECRET=test-secret npm run dev
   ```

## Running the tests

### Automatic mode (recommended)

A single command loads `.env.test`, runs migrations, applies the seed, starts the server in the background, runs Newman, and shuts down the server at the end:

```bash
cd spot-on
make postman-ci
```

Prerequisites: properly configured `.env.test`, accessible test DB, and `make postman-install` already executed once.

### Manual mode

To iterate (server running continuously, running tests multiple times):

```bash
cd spot-on
make postman-run
```

Generates an HTML report in `postman/reports/report-<timestamp>.html` to attach to the project report.

### Via Postman (GUI)

1. Import `Spot-On.postman_collection.json`
2. Import `Spot-On.postman_environment.json` and select it
3. *Collection → Run* to run everything

## Coverage

The collection covers the main flows:

| Folder        | Tests                                                         |
| ------------- | ------------------------------------------------------------- |
| Auth          | 401 when test header is missing                               |
| Spaces        | List, filter (`type`, `hasPowerOutlet`), get by ID, 404       |
| Sessions      | Active space session, space session listing                   |
| Join requests | Rejection of invalid QR (403)                                 |
| Leaderboard   | Ordering by points, entry schemas                             |
| Notifications | List pending, 404 on nonexistent resource                     |
| QR code       | Public display endpoint                                       |
| Badges        | List badges of a user                                         |

## Relationship with Jest tests

Jest tests (`spot-on/__tests__/`) cover **internal logic** — functions, utilities, and script-level DB integrations. Postman/Newman tests cover the **system from the outside** — HTTP, API contracts, end-to-end behavior. They complement each other.
