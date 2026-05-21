# Spot-On — Automated Testing (Jest)

This directory contains the automated test suites for internal application logic and database integration, executed via [Jest](https://jestjs.io/).

## Structure

- `unit/`: Contains unit tests. These test individual functions, services, and utilities in isolation. External dependencies and the database are usually mocked.
- `integration/`: Contains integration tests. These verify that different components of the application work together correctly, particularly the interactions between the backend logic and the database using Prisma.

## Relationship with Postman Tests

While these Jest tests cover the **internal logic** and **code-level interactions**, the system's external behavior (HTTP endpoints and API contracts) is tested using Postman. Refer to the `postman/` directory for E2E API tests.
