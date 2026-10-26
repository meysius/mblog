# mblog

Personal blog and CMS: Next.js 16 (App Router, Cache Components), Drizzle ORM, Postgres 16 or newer.

## Setup

Postgres runs natively, for example Homebrew's: `brew install postgresql@16 && brew services start postgresql@16`. `.env.example` points at it on `localhost:5432` as the `postgres` user; change `DATABASE_URL` if yours differs.

```bash
cp .env.example .env
pnpm install
pnpm db:create   # the database DATABASE_URL names
pnpm db:migrate
pnpm db:seed     # optional: 100 sample posts, with tags
pnpm dev
```

- Blog: http://localhost:3000
- Admin: http://localhost:3000/admin. The first visit asks you to create the owner account; after that it's a normal sign-in. On a fresh deploy, do this right away, since setup is open until someone completes it.

`pnpm db:seed` (`scripts/seed.mts`) adds the same 100 sample posts every time: drafts and published posts from the last three years, about half with an excerpt, some with a generated feature image (local storage only), and each tagged with its topic (Software, Writing, Reading, Tools or Life) and sometimes Favorites or Notes. Running it again skips posts that are already there, and gives sample posts that have no tags their tags. Public pages are cached, so if the app is already running, save any post or restart it to see them there.

## Site address

Canonical links, share previews, the sitemap and the RSS feed need the site's full address. Development uses `http://localhost:3000`; for a production build, set it:

```bash
SITE_URL=https://example.com
```

Without it, `pnpm build` and `pnpm start` stop with an error that says so. Pages are prerendered with the address from build time, so rebuild after changing it.

## Image storage

Uploads go to local disk by default: `./uploads`, or the folder in `MEDIA_DIR`. Back it up along with the database.

Where the server's disk doesn't survive a redeploy, store them in an S3-compatible bucket (Cloudflare R2, AWS S3, Backblaze B2 and others):

```bash
MEDIA_STORAGE=s3
S3_BUCKET=mblog-media
S3_REGION=auto                # "auto" on R2; the bucket's region on AWS
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com   # leave out for AWS S3
S3_ACCESS_KEY_ID=…
S3_SECRET_ACCESS_KEY=…
```

The key needs to read, write, delete and list objects in the bucket (on R2, an API token with Object Read & Write on that bucket). The server checks these settings when it starts and logs any that are missing.

The app then serves images from the bucket itself, so the bucket can stay private. To have browsers load images straight from the bucket instead, make it public (on R2, connect a custom domain such as `media.example.com`) and set:

```bash
NEXT_PUBLIC_MEDIA_URL=https://media.example.com
```

It's read at build time, so rebuild after changing it. `/media/` links then redirect to the bucket. Posts keep storing `/media/<filename>` in every mode, so changing storage never means editing posts. Images already uploaded aren't copied over when you switch.

## Schema changes

Edit `src/db/schema.ts`, then run `pnpm db:generate` and `pnpm db:migrate`. Migrations live in `drizzle/` and are committed. Restart `pnpm dev` afterwards: the database client caches each table's columns, so queries that use a new column fail until it restarts.

## How it fits together

- `src/lib/posts.ts` and `src/lib/tags.ts`: all queries. Public reads use `'use cache'` + `cacheTag("posts")` and refresh at least hourly (`cacheLife("hours")`), because Next forgets `updateTag` calls when the server restarts; admin reads are uncached.
- `src/app/admin/actions.ts` and `tag-actions.ts`: server actions. Writes call `updateTag("posts")` so public pages refresh immediately.
- Auth: `src/lib/auth.ts` holds sessions (a random token in an httpOnly cookie, its SHA-256 in the `sessions` table) and `requireUser()`. Every admin read and server action calls `requireUser()`; `src/proxy.ts` only redirects visitors who have no session cookie at all. Passwords are hashed with scrypt (`src/lib/password.ts`).
- Sign-in limits (`src/lib/login-limits.ts`): an address gets 10 failed sign-ins per 15 minutes, and an email 100 per hour from all addresses together. Past that, attempts are refused until the window ends, before any password is checked. The counts are in the `login_limits` table, so they survive restarts; `delete from login_limits;` lifts every block at once. The address is the last entry in `X-Forwarded-For`, so run the app behind a reverse proxy that sets it: Caddy does by default, and nginx does with `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`.
- Draft preview: `/admin/posts/<id>/preview` renders any post, drafts included, with the site's layout (`src/components/post-article.tsx` is shared with the public post page). In the editor, Preview shows the post as readers will see it, unsaved edits included; "Open preview" in the settings panel opens this page instead, saving unsaved edits first without changing whether the post is published.
- Posts are Markdown (with GitHub extensions), rendered by `src/components/markdown.tsx`. Raw HTML is escaped. Styles for rendered posts live under `.prose` in `src/app/globals.css`. The RSS feed renders the same way with `markdownToHtml` in `src/lib/markdown.ts`, giving links and images full URLs.
- Post pages (`src/app/(site)/posts/[slug]/page.tsx`) render in full before they're sent (`ensureStatic = "navigation"`), so a missing or unpublished post returns a real 404. Published posts are prerendered at build; any other URL renders on its first visit and is kept until a save changes the posts, or for an hour.
- Tags: posts get them in the editor's settings panel, which suggests existing tags and makes new ones on save. Names match ignoring case, so "postgres" picks the existing "Postgres". A post keeps its tags in the order given (`post_tags.position`) and shows them as links at the end of the post. Each tag has a page, `/tags/<slug>`, listing its published posts, rendered like post pages and in the sitemap; a tag no published post has returns 404. Admin → Tags lists every tag with its post count (which opens the post list filtered to it, `/admin?tag=<slug>`) and edits a tag's name, URL and description, which shows on its page. Deleting a tag takes it off its posts; the posts stay. The RSS feed lists a post's tags as categories.
- SEO: `src/lib/site.ts` has the site's name, description and address. The root layout sets shared metadata and the RSS link; the post page adds its description, canonical URL, share previews (the feature image and tags) and JSON-LD; tag pages add their description and canonical URL. `src/app/sitemap.ts` and `src/app/robots.ts` generate `/sitemap.xml` and `/robots.txt`, and `src/app/rss/route.ts` serves the newest 20 posts in full at `/rss`.
- Images: the editor uploads to `POST /media` (`src/app/media/route.ts`). Each image is turned upright, scaled to at most 2000px and re-encoded with sharp, which also strips EXIF data such as GPS location (`src/lib/media-upload.ts`). Files go to local disk or an S3-compatible bucket (`src/lib/media-storage/`, see [Image storage](#image-storage)) and are recorded in the `media` table. Posts always refer to an image as `/media/<filename>`, which the app serves from storage with long-lived cache headers.
- Unused images are deleted automatically (`src/lib/media-usage.ts`). Each save records which images a post uses (body and feature image) in `post_media`. An image a save or delete stops using is deleted as soon as no other post uses it; an upload never saved into a post is deleted once it's a day old, so images in an unsaved editor survive.
- `pnpm build` needs the database running, because the home page is prerendered from it.
- UI: shadcn/ui on Base UI (`src/components/ui`, add more with `pnpm dlx shadcn@latest add <name>`). Colors and fonts are tokens in `src/app/globals.css`; dark mode follows the OS.
