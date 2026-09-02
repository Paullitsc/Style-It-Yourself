# Deployment

Production topology: **Vercel** serves the Next.js frontend at
`styleityourself.ca`, **Google Cloud Run** serves the FastAPI backend at
`api.styleityourself.ca`, **Cloudflare** holds DNS, and **Supabase** (already
provisioned) stays where it is. The Chrome extension builds against the
production URLs.

## 0. One-time prerequisites

```bash
brew install google-cloud-sdk
gcloud auth login
gcloud projects create siy-prod --name="Style It Yourself"   # or reuse one
gcloud config set project siy-prod
gcloud services enable run.googleapis.com cloudbuild.googleapis.com
```

## 1. Backend on Cloud Run

Deploy straight from source (Cloud Build builds `backend/Dockerfile`). The
container listens on 8000, so declare the port. Values for the env vars come
from `backend/.env`; NEVER commit them.

### Apply the rate limiting schema first

Rate limit counters are shared across instances through Supabase, so the table
and its RPC must exist before the revision that uses them goes live. In the
Supabase SQL Editor, run the `Rate limiting counters` section at the bottom of
`backend/supabase_schema.sql` (idempotent -- safe to re-run).

Verify:

```sql
SELECT * FROM public.consume_rate_limit('deploy-check', 5, 60);
-- expect: allowed = true, remaining = 4, retry_after = 0
```

Until it exists the API still serves traffic: the limiter logs an error and
falls back to per-instance counters, which is the pre-#7 behaviour rather than
an outage. Do not leave it that way.

```bash
gcloud run deploy siy-api \
  --source backend \
  --region us-east1 \
  --port 8000 \
  --allow-unauthenticated \
  --min-instances 0 --max-instances 3 \
  --memory 1Gi --timeout 120 \
  --set-env-vars "SUPABASE_URL=...,SUPABASE_KEY=...,SUPABASE_SERVICE_KEY=...,GEMINI_API_KEY=...,ENVIRONMENT=production,DEBUG=false" \
  --set-env-vars "^@^CORS_ORIGINS=https://styleityourself.ca,https://www.styleityourself.ca" \
  --set-env-vars "CORS_ORIGIN_REGEX=chrome-extension://.*"
```

Notes:
- `^@^` switches the delimiter so the comma inside `CORS_ORIGINS` survives.
- After the extension is published with a stable ID, pin
  `CORS_ORIGIN_REGEX=chrome-extension://<the-real-id>` and redeploy.
- Verify: `curl https://<run-url>/health` returns 200.

### Custom domain

```bash
gcloud beta run domain-mappings create --service siy-api \
  --domain api.styleityourself.ca --region us-east1
```

Then in Cloudflare DNS add the record the command prints (a CNAME from `api`
to `ghs.googlehosted.com`), **DNS only (grey cloud)**. Certificates provision
automatically within ~15 minutes. Until then, the default `*.run.app` URL
works fine as `NEXT_PUBLIC_API_URL`.

## 2. Frontend on Vercel

1. Import the GitHub repo in Vercel. Set **Root Directory = `frontend`**
   (Vercel detects the npm workspace and `@siy/ui` automatically).
2. Environment variables (Production):
   - `NEXT_PUBLIC_SUPABASE_URL` — from `frontend/.env.local`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from `frontend/.env.local`
   - `NEXT_PUBLIC_API_URL=https://api.styleityourself.ca`
3. Domains: add `styleityourself.ca` and `www.styleityourself.ca`.
4. Cloudflare DNS, both **DNS only (grey cloud)** — do not proxy Vercel:
   - `A styleityourself.ca → 76.76.21.21`
   - `CNAME www → cname.vercel-dns.com`

## 3. Supabase auth URLs

Dashboard → Authentication → URL Configuration:
- Site URL: `https://styleityourself.ca`
- Additional redirect URLs: `https://www.styleityourself.ca`,
  `http://localhost:3000` (keep for local dev).

## 4. Extension production build

```bash
cd extension
cat > .env <<'ENV'
SIY_API_BASE_URL=https://api.styleityourself.ca
SIY_WEB_APP_URL=https://styleityourself.ca
ENV
npm run build   # Supabase values still flow from ../frontend/.env.local
```

The manifest already allows `styleityourself.ca` in `externally_connectable`
and the production API in `host_permissions`. Publish `dist/` to the Chrome
Web Store. Once the store assigns the final extension ID you must do two
things or the extension won't work end to end:

1. Pin the backend's `CORS_ORIGIN_REGEX` to `chrome-extension://<id>` (step 1)
   and redeploy.
2. Set `NEXT_PUBLIC_SIY_EXTENSION_ID=<id>` in Vercel (Production) and redeploy
   the frontend. The `/extension/connect` page refuses to hand its session to
   any extension ID not in this allowlist, so if it's unset the connect flow
   fails closed by design. For local dev, set it to your unpacked extension's
   ID in `frontend/.env.local`.

## 5. Launch checklist

- [ ] Cloud Run `/health` 200 on `api.styleityourself.ca`
- [ ] `styleityourself.ca` renders, login works (Supabase URLs set)
- [ ] Save a piece + closet load against production API
- [ ] Try-on generates (Gemini key valid, 120s timeout enough)
- [ ] `NEXT_PUBLIC_SIY_EXTENSION_ID` set in Vercel; extension connects and imports an item
- [ ] `CORS_ORIGIN_REGEX` pinned to the published extension ID (the API logs a startup warning while it is still the `chrome-extension://.*` wildcard)
- [ ] `consume_rate_limit` RPC exists in Supabase; backend logs show no "Rate limit RPC failed" errors

## 6. Redeploying after code changes

The frontend is deployed via the Vercel CLI (not git-connected — the repo
lives under a different owner, so the Vercel GitHub App isn't installed). Both
services deploy from the local checkout, so redeploys are manual until someone
with repo-admin installs the Vercel GitHub App and a Cloud Build trigger.

**Frontend (Vercel):** after merging to `main`,
```bash
git checkout main && git pull
cd ~/Style-It-Yourself
npx vercel deploy --prod --yes --scope <your-vercel-scope>
```
The build reads env vars from the Vercel project, not local files.

**Backend (Cloud Run):** after merging backend changes,
```bash
git checkout main && git pull
cd ~/Style-It-Yourself
set -a; source backend/.env; set +a
gcloud run deploy siy-api --source backend --region us-east1 --port 8000 \
  --project gen-lang-client-0131380129 \
  --allow-unauthenticated --min-instances 0 --max-instances 3 \
  --memory 1Gi --timeout 120 \
  --set-env-vars "^@^SUPABASE_URL=${SUPABASE_URL}@SUPABASE_KEY=${SUPABASE_KEY}@SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}@GEMINI_API_KEY=${GEMINI_API_KEY}@ENVIRONMENT=production@DEBUG=false@CORS_ORIGINS=https://styleityourself.ca,https://www.styleityourself.ca@CORS_ORIGIN_REGEX=chrome-extension://.*"
```
Cloud Run keeps every revision, so a bad deploy rolls back instantly via
`gcloud run services update-traffic siy-api --region us-east1 --to-revisions <prev>=100`.

**If you rotate a secret** (Supabase/Gemini): update `backend/.env`, redeploy
the backend with the command above, and — for `NEXT_PUBLIC_*` values — update
them in the Vercel dashboard and redeploy the frontend.

## 7. Monitoring and costs

**Frontend — Vercel** (`vercel.com` → the `style-it-yourself` project):
- **Observability** tab: requests, error rate, and latency per route.
- **Logs** tab: live build and runtime logs.
- **Usage** (account → Usage): bandwidth and function invocations vs the Hobby
  limits. Hobby has no overage billing — it pauses rather than charges.

**Backend — Cloud Run** (`console.cloud.google.com` → Cloud Run → `siy-api`,
project `gen-lang-client-0131380129`, region `us-east1`):
- **Metrics** tab: request count, latency, instance count, billable time.
- **Logs** tab: every request and Python traceback.
- Free tier (2M requests + 180k vCPU-seconds/month) covers small-scale use.
  The realistic cost is **Gemini image generation** (each try-on), which shows
  under **Billing → Reports** filtered to "Generative Language API".
- **Set a budget alert:** Billing → Budgets & alerts → create a budget with
  email thresholds (e.g. $5 / $10 / $20) so a runaway try-on loop or a leaked
  key can't rack up a silent bill.

**Supabase** (`supabase.com/dashboard` → project):
- **Reports**: API requests, DB size, storage, and egress over time.
- **Settings → Usage**: monthly active users, storage, and egress vs the free
  tier.
- **Logs** (Auth / Postgres / Storage): per-request logs for debugging.

A note on DDoS: the Cloudflare DNS records are all grey-cloud (DNS-only), so
Cloudflare isn't filtering traffic. Vercel protects the frontend; the Cloud
Run API is directly exposed, so app-level rate limiting (and optionally Cloud
Armor) is the mitigation there.
