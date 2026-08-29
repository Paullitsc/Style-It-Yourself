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
Web Store; once the store assigns the final extension ID, pin the backend's
`CORS_ORIGIN_REGEX` (step 1) and update the landing page's extension button
to the store listing.

## 5. Launch checklist

- [ ] Cloud Run `/health` 200 on `api.styleityourself.ca`
- [ ] `styleityourself.ca` renders, login works (Supabase URLs set)
- [ ] Save a piece + closet load against production API
- [ ] Try-on generates (Gemini key valid, 120s timeout enough)
- [ ] Extension connects on the production domain and imports an item
- [ ] `CORS_ORIGIN_REGEX` pinned to the published extension ID
