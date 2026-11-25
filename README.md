This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

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

## Database migrations

Change the schema only with a migration, never with `prisma db push`:

```bash
npx prisma migrate dev --name <change>
```

Production applies the committed migrations with:

```bash
npx prisma migrate deploy
```

The migration history was reset to a single `init` migration on 2026-11-21. The earlier migrations are kept in `prisma/migrations_archive/` for reference only; Prisma does not read them.

To seed the minimum data for local sign-in (Supabase Auth users plus database rows), run `node --experimental-strip-types prisma/seed.ts`.

`prisma/seed-vehicles.ts` is **demo-only**: it adds made-up models and bikes (`VIN-PULSE-*`, `VIN-TERRA-*`, `VIN-APEX-*`) and refuses to run unless `SEED_DEMO=true` is set. Never run it against the shared or live database:

```bash
SEED_DEMO=true SEED_ORG_SUBDOMAIN=<subdomain> node --experimental-strip-types prisma/seed-vehicles.ts
```

The e2e suite does not use it: it creates and removes its own dealerships (`E2E Motors`, `E2E Other Motors`, `E2E Owner Lab`) and never touches a real one.

## Database connection (Supabase + Prisma, serverless)

Two connection strings, two jobs:

| Variable | Used for | Should point at |
|---|---|---|
| `DATABASE_URL` | the running app (Prisma Client) | Supabase **transaction pooler**, port **6543**, with `?pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | `prisma migrate` only | Supabase **session pooler** (port 5432) or the direct connection |

- `pgbouncer=true` turns off prepared statements, which the transaction pooler does not support.
- `connection_limit=1` keeps each serverless instance to one connection so many instances do not exhaust the pooler.
  That suits Vercel, where the database is close and queries take milliseconds. For local development against a
  remote database use a higher limit (for example `connection_limit=5&pool_timeout=30`): with one connection the
  Reports page's parallel queries run one after another and can exceed the pool timeout (`P2024`).
- Set both variables in the Vercel project (Settings → Environment Variables) for Production and Preview. Run
  `npx prisma migrate deploy` with `DIRECT_URL` available (a build step or a CI job), never against the transaction pooler.
- `lib/prisma.ts` keeps a single `PrismaClient` per instance and retries read-only queries (not writes, and not anything
  inside a transaction) up to three times when the connection drops (`P1001`, `P1017`).
