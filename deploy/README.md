# Production deploy

mblog runs at https://blog.feghhi.com on the DigitalOcean droplet it shares with portifo and the Ghost blog (`ssh-blog`). The server pulls its releases. GitHub has no credentials for it and no way in. This works like portifo's deploy, apart from two things that come from how Next.js builds:

- **The build needs a database.** `next build` prerenders pages from it, so CI builds against an empty, throwaway Postgres. Until the server marks them out of date, a release's home page, `/rss` and `/sitemap.xml` list no posts. `mblog.service` does that every time it starts (`mblog-reset-cache`), and the start only counts once it has worked.
- **A release has no drizzle-kit.** It ships Next's standalone server, which has only the packages the app uses. So the workflow bundles `scripts/migrate.mts`, with drizzle-orm and pg, into `migrate.cjs`. It applies `drizzle/` like `pnpm db:migrate`, and both record migrations in the same table.

## How it works

1. **On every push to `main`**, `.github/workflows/deploy.yml` migrates a throwaway database with `migrate.cjs` (which also tests it), runs `pnpm build` with `SITE_URL=https://blog.feghhi.com`, and packs `.next/standalone`, `.next/static`, `drizzle/` and `migrate.cjs` into `mblog.tar.gz`. Next to it goes `release.txt`, with the commit and the tarball's SHA-256. Both are published as the GitHub release `deploy-<commit>`, marked Latest. The workflow keeps the newest 5 releases and only needs the built-in `GITHUB_TOKEN`.
2. **GitHub's release webhook** calls `POST https://blog.feghhi.com/hooks/github` (`src/app/hooks/github/route.ts`). The app checks the HMAC signature (`GITHUB_WEBHOOK_SECRET`). When a release is published, it writes that release's commit to `/opt/mblog/shared/deploy-requested`. Every other event gets a 200 and is ignored.
3. **`mblog-deploy.path`** sees that file change and starts **`mblog-deploy.service`**, which runs `/usr/local/sbin/mblog-deploy`. **`mblog-deploy.timer`** also starts it every 5 minutes, in case a webhook is lost or the app is down.
4. **The script** reads `release.txt` from the Latest release on GitHub and stops if that commit is already live. If the webhook named a commit and Latest still shows the live one, it re-checks every 5 seconds for up to 2 minutes. That commit only sets how long to wait. The script deploys whatever Latest says, so a leaked webhook secret can only make the server check early. Then it:
   1. downloads the tarball and checks it against the SHA-256,
   2. extracts it to `/opt/mblog/releases/<commit>`,
   3. migrates the database with the release's `migrate.cjs`,
   4. points `/opt/mblog/current` at it and restarts `mblog`,
   5. waits for the start to finish (the server answers and its cache is reset), then checks that the home page renders and the service is still up 5 seconds later.

   If the new release doesn't come up, the script switches back to the previous one and won't retry that commit.

Only `systemctl restart` and the checks run as root. Downloading, extracting, migrating and switching run as `mblog`, and so does the app. The scripts and units are installed by hand from this folder. Never install them from a release, so a push to `main` can't change what runs as root.

`mblog-reset-cache` POSTs to `/hooks/revalidate` on `127.0.0.1:3001` with `REVALIDATE_SECRET`. nginx returns 404 for that path, so only the server can call it.

## Operating it

```bash
ssh-blog
journalctl -u mblog-deploy -n 50        # what the last deploys did
journalctl -u mblog -f                  # the app's log
systemctl start mblog-deploy            # check GitHub now
systemctl list-timers mblog-deploy      # next scheduled check
readlink /opt/mblog/current             # the live release
```

On GitHub, each webhook delivery and its response are listed under Settings → Webhooks → (the hook) → Recent Deliveries.

**Roll back:** mark an older release Latest with `gh release edit deploy-<commit> --latest`, or delete the bad release. The server deploys whatever is Latest at its next check, within 5 minutes (only a published release triggers an immediate check). Migrations never roll back, so each one must still work with the release before it: add columns freely, and rename or drop them a release later.

**After a failed start:** the server won't retry that commit. Push a fix, or delete `/var/lib/mblog-deploy/failed-commit` and run `systemctl start mblog-deploy`.

**Moving to feghhi.com:** change `SITE_URL` in `.github/workflows/deploy.yml` and in `/opt/mblog/shared/.env`, put `feghhi.com` in `server_name` in the nginx site (after retiring Ghost's sites), point the webhook at the new address and push. Pages are prerendered with `SITE_URL`, so it needs the new build.

## Where things are

| | |
|---|---|
| App settings and secrets | `/opt/mblog/shared/.env` (mblog, 0600) |
| Uploaded images (`MEDIA_DIR`) | `/opt/mblog/shared/uploads`. Back them up with the database. |
| Database | `mblog`, owned by the `mblog` role, in the droplet's Postgres 16 that portifo also uses |
| Releases (newest 5) and the live one | `/opt/mblog/releases/`, `/opt/mblog/current` |
| The app | `mblog.service`: `node server.js` on 127.0.0.1:3001 |
| nginx site | `/etc/nginx/sites-available/blog.feghhi.com.conf`, a copy of `blog.feghhi.com.conf` here |
| TLS certificate | `/etc/letsencrypt/blog.feghhi.com/`, issued and renewed by the acme.sh in `/etc/letsencrypt` (its daily cron, which also renews portifo's and Ghost's) |

## Installing or updating the server side

There's no checkout on the server, so copy this folder over from yours, then install as root whenever any of these files change:

```bash
scp -i ~/.ssh/blog -r deploy root@178.128.231.71:/root/mblog-deploy
ssh-blog
cd /root/mblog-deploy
install -m 0755 mblog-deploy mblog-reset-cache /usr/local/sbin/
install -m 0644 mblog.service mblog-deploy.service mblog-deploy.path mblog-deploy.timer /etc/systemd/system/
install -m 0644 blog.feghhi.com.conf /etc/nginx/sites-available/
systemctl daemon-reload
nginx -t && systemctl reload nginx
```

### First-time setup

Done once, on 2026-11-06. Here for rebuilding the server:

1. An A record for `blog.feghhi.com` pointing at the droplet (Route 53).
2. The `mblog` system user (`useradd --system --no-create-home --shell /usr/sbin/nologin mblog`), and `/opt/mblog/releases` and `/opt/mblog/shared/uploads` owned by it, with `shared` at 0750.
3. As `postgres`: `create role mblog login password '…'; create database mblog owner mblog;`
4. `/opt/mblog/shared/.env` (owned by mblog, 0600). `GITHUB_WEBHOOK_SECRET` and `REVALIDATE_SECRET` are each `openssl rand -hex 32`:
   ```bash
   NODE_ENV=production
   PORT=3001
   HOSTNAME=127.0.0.1
   DATABASE_URL=postgres://mblog:…@127.0.0.1:5432/mblog
   SITE_URL=https://blog.feghhi.com
   MEDIA_DIR=/opt/mblog/shared/uploads
   GITHUB_WEBHOOK_SECRET=…
   DEPLOY_REQUEST_FILE=/opt/mblog/shared/deploy-requested
   REVALIDATE_SECRET=…
   ```
5. The certificate. nginx needs the site's port 80 block first (with the acme-challenge location), since the full site doesn't load without the certificate:
   ```bash
   /etc/letsencrypt/acme.sh --home /etc/letsencrypt --issue -d blog.feghhi.com -w /var/www/blog/nginx-root --server letsencrypt
   /etc/letsencrypt/acme.sh --home /etc/letsencrypt --install-cert -d blog.feghhi.com --ecc \
     --key-file /etc/letsencrypt/blog.feghhi.com/blog.feghhi.com.key \
     --fullchain-file /etc/letsencrypt/blog.feghhi.com/fullchain.cer \
     --reloadcmd "systemctl reload nginx"
   ```
6. The install steps above, plus `ln -s /etc/nginx/sites-available/blog.feghhi.com.conf /etc/nginx/sites-enabled/`, `systemctl enable mblog` and `systemctl enable --now mblog-deploy.path mblog-deploy.timer`.
7. A repository webhook: Settings → Webhooks, payload URL `https://blog.feghhi.com/hooks/github`, content type `application/json`, the secret from `.env`, only the **Releases** event.
8. After the first deploy, create the owner account at https://blog.feghhi.com/admin/setup right away: it's open until someone does.
