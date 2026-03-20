This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

## Makefile Commands

This project now ships with a `Makefile` to centralize local and Docker workflows.

```bash
make help
```

Most useful targets:

- `make install` - install dependencies (`npm ci` when lockfile exists)
- `make dev` - start Next.js in development mode
- `make test` - run Jest tests once
- `make lint` - run ESLint
- `make prisma-seed` - seed local database
- `make docker-recreate` - replacement for old `run.sh` flow (down/build/up/wait/seed/logs)
- `make swagger-url` - print Swagger UI URL
- `make swagger-check` - check if Swagger endpoint is reachable
- `make swagger-open` - open Swagger UI in browser

Swagger UI is available at `http://localhost:3000/api-doc` (or the port shown by Next.js logs).

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
