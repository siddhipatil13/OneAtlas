# OneAtlas.dev

OneAtlas is an AI model discovery and intelligence platform. It provides model discovery and details, side-by-side comparisons, benchmark rankings, and directories for AI labs and inference providers.

## Technology

- Next.js App Router, React, TypeScript, and Tailwind CSS
- PostgreSQL with Prisma ORM
- Next.js route handlers for the JSON API

## Local setup

Requirements: Node.js, npm, and a reachable PostgreSQL database.

1. Install dependencies:

   ```powershell
   npm ci
   ```

2. Copy the environment template and edit the local copy:

   ```powershell
   Copy-Item .env.example .env
   ```

   Set `DATABASE_URL` in `.env` to the PostgreSQL connection URL for the OneAtlas database. Keep `.env` private; only the placeholder `.env.example` belongs in source control.

3. Apply the checked-in migrations and optionally load illustrative sample records:

   ```powershell
   npm run db:deploy
   npm run db:seed
   ```

4. Start the development server:

   ```powershell
   npm run dev
   ```

Open `http://localhost:3000`.

## Database commands

- `npm run db:migrate` — create and apply migrations during local schema development.
- `npm run db:deploy` — apply checked-in migrations to a database, including production databases.
- `npm run db:seed` — insert the illustrative sample companies, providers, models, and benchmark records. The seed is safe to rerun for the same sample dataset.
- `npm run db:studio` — open Prisma Studio for local database inspection.

For a deployment, configure `DATABASE_URL` in the hosting environment and run `npm run db:deploy` as a release step before serving the application. Never expose this server-side variable through a `NEXT_PUBLIC_` variable.

## Quality checks

```powershell
npx prisma validate
npx tsc --noEmit
npm run lint
npm run build
```

The home dashboard includes clearly labeled preview snapshot content. The directory, detail, comparison, and rankings pages use the PostgreSQL-backed API.
