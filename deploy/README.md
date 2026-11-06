# Production deploy

mblog runs at https://feghhi.com on the DigitalOcean droplet it shares with portifo (`ssh-blog`). It replaced the Ghost blog there on 2026-11-06 (see [Ghost](#ghost)). The server pulls its releases. GitHub has no credentials for it and no way in. This works like portifo's deploy, apart from two things that come from how Next.js builds:

- **The build needs a database.** `next build` prerenders pages from it, so CI builds against an empty, throwaway Postgres. Until the server marks them out of date, a release's home page, `/rss` and `/sitemap.xml` list no posts. `mblog.service` does that every time it starts (`mblog-reset-cache`), and the start only counts once it has worked.
- **A release has no drizzle-kit.** It ships Next's standalone server, which has only the packages the app uses. So the workflow bundles `scripts/migrate.mts`, with drizzle-orm and pg, into `migrate.cjs`. It applies `drizzle/` like `pnpm db:migrate`, and both record migrations in the same table.

## How it works

1. **On every push to `main`**, `.github/workflows/deploy.yml` migrates a throwaway database with `migrate.cjs` (which also tests it), runs `pnpm build` with `SITE_URL=https://feghhi.com`, and packs `.next/standalone`, `.next/static`, `drizzle/` and `migrate.cjs` into `mblog.tar.gz`. Next to it goes `release.txt`, with the commit and the tarball's SHA-256. Both are published as the GitHub release `deploy-<commit>`, marked Latest. The workflow keeps the newest 5 releases and only needs the built-in `GITHUB_TOKEN`.
2. **GitHub's release webhook** calls `POST https://feghhi.com/hooks/github` (`src/app/hooks/github/route.ts`). The app checks the HMAC signature (`GITHUB_WEBHOOK_SECRET`). When a release is published, it writes that release's commit to `/opt/mblog/shared/deploy-requested`. Every other event gets a 200 and is ignored.
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
journalctl -u mblog-backup -n 20        # the last backups
systemctl start mblog-deploy            # check GitHub now
systemctl list-timers 'mblog-*'         # next deploy check and backup
readlink /opt/mblog/current             # the live release
```

On GitHub, each webhook delivery and its response are listed under Settings → Webhooks → (the hook) → Recent Deliveries.

**Roll back:** mark an older release Latest with `gh release edit deploy-<commit> --latest`, or delete the bad release. The server deploys whatever is Latest at its next check, within 5 minutes (only a published release triggers an immediate check). Migrations never roll back, so each one must still work with the release before it: add columns freely, and rename or drop them a release later.

**After a failed start:** the server won't retry that commit. Push a fix, or delete `/var/lib/mblog-deploy/failed-commit` and run `systemctl start mblog-deploy`.

**Changing the address:** `SITE_URL` is in `.github/workflows/deploy.yml` and in `/opt/mblog/shared/.env`, and pages are prerendered with it, so change both and push. The nginx site, the certificate and the webhook's URL name the domain too.

## Backups

**The database**: `mblog-backup.timer` runs `/usr/local/sbin/mblog-backup` every day at about 06:00 UTC. It dumps the database with `pg_dump --format=custom`, checks the dump has the posts table, uploads it to `s3://feghhi-blog-backups/mblog/db/mblog_<date>_<time>.dump` and checks its size there. Only then does it delete dumps older than 30 days, always keeping the newest 7, so a failing run never costs a good backup. It uses the `mblog-backup` IAM user, which can only use the bucket's `mblog/` folder (key in `/etc/mblog-backup/aws-credentials`, root only).

To restore one, as root on the server (this replaces what's in the database):

```bash
AWS_SHARED_CREDENTIALS_FILE=/etc/mblog-backup/aws-credentials aws s3 cp s3://feghhi-blog-backups/mblog/db/<file>.dump /tmp/
chown mblog /tmp/<file>.dump
setpriv --reuid=mblog --regid=mblog --init-groups -- pg_restore --clean --if-exists --no-owner -d mblog /tmp/<file>.dump
systemctl restart mblog   # resets the cache, so pages show the restored posts
```

**Images** live in the S3 bucket `feghhi-mblog-media`, not on the droplet, so they need no copy of their own. The app deletes images no post uses any more, though, and those deletions are permanent.

## Where things are

| | |
|---|---|
| App settings and secrets | `/opt/mblog/shared/.env` (mblog, 0600) |
| Uploaded images | The private S3 bucket `feghhi-mblog-media` (ca-central-1). Only the IAM user `mblog-media` can use it: get, put and delete objects, and list the bucket so a missing image is a 404 rather than access denied. The app serves images at `/media/<filename>`. |
| Database | `mblog`, owned by the `mblog` role, in the droplet's Postgres 16 that portifo also uses |
| Database backups | `s3://feghhi-blog-backups/mblog/db/` (us-east-2), see [Backups](#backups) |
| Releases (newest 5) and the live one | `/opt/mblog/releases/`, `/opt/mblog/current` |
| The app | `mblog.service`: `node server.js` on 127.0.0.1:3001 |
| nginx site | `/etc/nginx/sites-available/feghhi.com.conf`, a copy of `feghhi.com.conf` here. www.feghhi.com and plain HTTP redirect to https://feghhi.com, and Ghost's old post address redirects to its new one. |
| TLS certificate | `/etc/letsencrypt/feghhi.com/`, for feghhi.com and www.feghhi.com, issued and renewed by the acme.sh in `/etc/letsencrypt` (its daily cron, which also renews portifo's) from the webroot `/var/www/blog/nginx-root` |
| DNS | Route 53, zone `feghhi.com`: A records for `feghhi.com` and `www`, both pointing at the droplet |

## Installing or updating the server side

There's no checkout on the server, so copy this folder over from yours, then install as root whenever any of these files change:

```bash
scp -i ~/.ssh/blog -r deploy root@178.128.231.71:/root/mblog-deploy
ssh-blog
cd /root/mblog-deploy
install -m 0755 mblog-deploy mblog-reset-cache mblog-backup /usr/local/sbin/
install -m 0644 mblog.service mblog-deploy.service mblog-deploy.path mblog-deploy.timer \
  mblog-backup.service mblog-backup.timer /etc/systemd/system/
install -m 0644 feghhi.com.conf /etc/nginx/sites-available/
systemctl daemon-reload
nginx -t && systemctl reload nginx
```

### First-time setup

Done once, on 2026-11-06 (first at blog.feghhi.com, then moved to feghhi.com the same day). Here for rebuilding the server:

1. A records for `feghhi.com` and `www.feghhi.com` pointing at the droplet (Route 53).
2. The `mblog` system user (`useradd --system --no-create-home --shell /usr/sbin/nologin mblog`), and `/opt/mblog/releases` and `/opt/mblog/shared` owned by it, with `shared` at 0750.
3. As `postgres`: `create role mblog login password '…'; create database mblog owner mblog;`
4. `/opt/mblog/shared/.env` (owned by mblog, 0600). `GITHUB_WEBHOOK_SECRET` and `REVALIDATE_SECRET` are each `openssl rand -hex 32`:
   ```bash
   NODE_ENV=production
   PORT=3001
   HOSTNAME=127.0.0.1
   DATABASE_URL=postgres://mblog:…@127.0.0.1:5432/mblog
   SITE_URL=https://feghhi.com
   GITHUB_WEBHOOK_SECRET=…
   DEPLOY_REQUEST_FILE=/opt/mblog/shared/deploy-requested
   REVALIDATE_SECRET=…
   MEDIA_STORAGE=s3
   S3_BUCKET=feghhi-mblog-media
   S3_REGION=ca-central-1
   S3_ACCESS_KEY_ID=…       # the mblog-media IAM user's access key
   S3_SECRET_ACCESS_KEY=…
   ```
   The bucket blocks all public access. `mblog-media`'s inline policy `mblog-media-bucket` allows `s3:GetObject`, `s3:PutObject` and `s3:DeleteObject` on `arn:aws:s3:::feghhi-mblog-media/*`, and `s3:ListBucket` on the bucket itself.
5. The certificate. nginx needs a port 80 block for both names first, serving `/.well-known/acme-challenge` from `/var/www/blog/nginx-root`, since the full site doesn't load without the certificate:
   ```bash
   /etc/letsencrypt/acme.sh --home /etc/letsencrypt --issue -d feghhi.com -d www.feghhi.com -w /var/www/blog/nginx-root --server letsencrypt
   /etc/letsencrypt/acme.sh --home /etc/letsencrypt --install-cert -d feghhi.com --ecc \
     --key-file /etc/letsencrypt/feghhi.com/feghhi.com.key \
     --fullchain-file /etc/letsencrypt/feghhi.com/fullchain.cer \
     --reloadcmd "systemctl reload nginx"
   ```
6. The backup user: IAM user `mblog-backup` with an inline policy allowing `s3:GetObject`, `s3:PutObject` and `s3:DeleteObject` on `arn:aws:s3:::feghhi-blog-backups/mblog/*`, and `s3:ListBucket` on the bucket for the prefix `mblog/`. Its key goes in `/etc/mblog-backup/aws-credentials` (root, 0600) as a `[default]` profile.
7. The install steps above, plus `ln -s /etc/nginx/sites-available/feghhi.com.conf /etc/nginx/sites-enabled/`, `systemctl enable mblog` and `systemctl enable --now mblog-deploy.path mblog-deploy.timer mblog-backup.timer`.
8. A repository webhook: Settings → Webhooks, payload URL `https://feghhi.com/hooks/github`, content type `application/json`, the secret from `.env`, only the **Releases** event.
9. After the first deploy, create the owner account at https://feghhi.com/admin/setup right away: it's open until someone does.

## Ghost

feghhi.com ran Ghost 6 (with MySQL 8) on this droplet until 2026-11-06. Its one post and its About page were moved into mblog with their dates. Then Ghost, MySQL and the old blog.feghhi.com address were removed.

Everything Ghost had is in `s3://feghhi-blog-backups/` (us-east-2), which the AWS CLI on your Mac can read:

- `ghost-final-2026-11-06/`: the final backup, taken after feghhi.com moved to mblog. It has the MySQL dump (`feghhi_prod.sql.gz`), Ghost's `content/` folder with images, themes, settings and an April JSON export (`ghost-content.tar.gz`), `config.production.json`, Ghost's nginx sites and certificate files (`ghost-server-files.tar.gz`), and `SHA256SUMS`.
- `db_backups/`: Ghost's daily MySQL dumps from the week before, and `content/` and `config.production.json` from its daily sync. The job that made them (`/home/meysam/backup.sh`, from the `meysam` user's crontab) is switched off, so nothing deletes them.
