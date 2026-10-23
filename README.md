# mblog

Personal blog and CMS: Next.js 16 (App Router, Cache Components), Drizzle ORM, Postgres 18.

## Setup

```bash
cp .env.example .env
pnpm install
pnpm db:up       # Postgres in Docker on localhost:5433
pnpm db:migrate
pnpm dev
```

- Blog: http://localhost:3000
- Admin: http://localhost:3000/admin. The first visit asks you to create the owner account; after that it's a normal sign-in. On a fresh deploy, do this right away, since setup is open until someone completes it.

## Schema changes

Edit `src/db/schema.ts`, then run `pnpm db:generate` and `pnpm db:migrate`. Migrations live in `drizzle/` and are committed.

## How it fits together

- `src/lib/posts.ts`: all queries. Public reads use `'use cache'` + `cacheTag("posts")`; admin reads are uncached.
- `src/app/admin/actions.ts`: server actions. Writes call `updateTag("posts")` so public pages refresh immediately.
- Auth: `src/lib/auth.ts` holds sessions (a random token in an httpOnly cookie, its SHA-256 in the `sessions` table) and `requireUser()`. Every admin read and server action calls `requireUser()`; `src/proxy.ts` only redirects visitors who have no session cookie at all. Passwords are hashed with scrypt (`src/lib/password.ts`).
- Posts are Markdown (with GitHub extensions), rendered by `src/components/markdown.tsx`. Raw HTML is escaped. Styles for rendered posts live under `.prose` in `src/app/globals.css`.
- `pnpm build` needs the database running, because the home page is prerendered from it.
- UI: shadcn/ui on Base UI (`src/components/ui`, add more with `pnpm dlx shadcn@latest add <name>`). Colors and fonts are tokens in `src/app/globals.css`; dark mode follows the OS.
