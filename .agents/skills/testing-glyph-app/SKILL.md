---
name: testing-glyph-app
description: How to run and test the Glyph Next.js app locally and verify the live Railway deployment. Covers stub env vars for local dev, the middleware whitelist gotcha for public/ assets, OAuth redirect_uri verification, and Railway deployment status polling. Use this whenever testing UI, metadata, auth, middleware, or deployment-config changes on this repo.
---

# Testing the Glyph app

## TL;DR

- This is a Next.js 15 app with **manual** Google OAuth (uses `jose` JWT, not next-auth) — despite the legacy `NEXTAUTH_URL` env var name.
- The deployed live app is at `https://glyph-ai-production.up.railway.app` (Railway service id `af304635-bed0-4be0-80bb-745a155473c1`, project id `17d0108a-3bf4-452d-a2e3-d5f286b87961`, production environment id `01230987-b313-4c5d-9b36-4896b6f05bb7`).
- The legacy domain `https://project-storyboard-production.up.railway.app` also serves the same service and is kept alive for back-compat with existing share links — both domains route to the same code.
- The live deployment branch is `main`. Railway auto-redeploys on push to `main`; builds typically take 2–3 min. Direct pushes to `main` are blocked by Devin guardrails — open a PR into `main` for code changes, or use the GitHub REST API (`gh api`) for branch-creation-only operations.

## Run the app locally with stubbed env vars

For UI / metadata / middleware testing you do **not** need real credentials. Stubs are enough as long as the page you're testing doesn't hit Prisma or call out to OpenAI/Exa. Public routes (`/login`, `/s/[id]`) and static asset routes are safe; the landing page `/` and `/generate` will partially work but anything that hits the DB will 500.

From the repo root:

```bash
OPENAI_API_KEY=dummy \
EXA_API_KEY=dummy \
DATABASE_URL="postgresql://localhost:5432/dummy" \
AUTH_SECRET=dummy \
GOOGLE_CLIENT_ID=dummy \
GOOGLE_CLIENT_SECRET=dummy \
AUTH_URL="http://localhost:3000" \
NEXTAUTH_URL="http://localhost:3000" \
npm run dev
```

Server comes up at `http://localhost:3000`. `npm run build` also works with the same stubs.

## Auth model (manual, NOT next-auth)

- Sign-in entry point: `GET /api/auth/signin` — issues a `302 Location` to Google OAuth (`accounts.google.com/o/oauth2/v2/auth?...`).
- The `redirect_uri` parameter is built from `AUTH_URL`. After flipping `AUTH_URL` on Railway, verify with:
  ```bash
  curl -sI https://<host>/api/auth/signin | grep -i ^location
  ```
  The `redirect_uri` decoded from the URL must exactly match `https://<host>/api/auth/callback/google`. If it doesn't, `AUTH_URL` didn't take effect.
- The corresponding URI must be present in the Google OAuth client's Authorized redirect URIs at https://console.cloud.google.com/ — owner action.
- Session is a `session_token` cookie. Without it, protected routes redirect to `/login`.

## Middleware route gating — gotcha for `public/` assets

The middleware in `src/middleware.ts` whitelists public routes by **path prefix** (`/api/auth`, `/api/share/`, `/login`, `/s/`, `/_next`) plus the `favicon.ico` exact match. The Next.js matcher only excludes `_next/static`, `_next/image`, and `favicon.ico`.

This means: **anything you add to `public/` other than `favicon.ico` will be auth-gated** and `307`-redirected to `/login` unless you also whitelist it. This bit us when we added `/og-image.png` — social crawlers (Slack/Twitter/LinkedIn) fetched the URL, got redirected to `/login`, and unfurled nothing.

The fix (already in the repo) is a regex whitelist for common static-asset file extensions in the middleware function body. When adding a new static asset, sanity-check with:

```bash
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' http://localhost:3000/your-new-file.png
```

Expect `200`. If you see `307 ... /login`, the extension isn't in the whitelist.

## Verify the live Railway deployment

Auth uses an env var named `RAILWAY_API_TOKEN`. Use the Railway GraphQL API at `https://backboard.railway.app/graphql/v2` directly (the `railway-mcp` server has occasionally failed to initialize in our sessions).

Latest deployment status for the Glyph service:

```bash
curl -s -X POST https://backboard.railway.app/graphql/v2 \
  -H "Authorization: Bearer ${RAILWAY_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"query":"query { deployments(first: 1, input: { serviceId: \"af304635-bed0-4be0-80bb-745a155473c1\", environmentId: \"01230987-b313-4c5d-9b36-4896b6f05bb7\" }) { edges { node { status meta } } } }"}' \
  | python3 -c "import sys, json; d = json.load(sys.stdin)['data']['deployments']['edges'][0]['node']; print('status:', d['status']); print('commit:', d['meta'].get('commitHash','?')[:10]); print('msg:', d['meta'].get('commitMessage','')[:80])"
```

`status` progresses `BUILDING` → `DEPLOYING` → `SUCCESS`. A typical merge-triggered deploy is ready within ~3 minutes.

Quick app-level smoke check after a deploy:

```bash
HOST=https://glyph-ai-production.up.railway.app
curl -s $HOST/login | python3 -c "import sys, re; html=sys.stdin.read(); [print(label+':', repr(m.group(1)) if m else 'MISSING') for label, pat in [('title',r'<title>(.*?)</title>'),('h1',r'<h1[^>]*>(.*?)</h1>')] for m in [re.search(pat, html, re.S)]]"
curl -s -o /dev/null -w '/og-image.png -> %{http_code} %{content_type} %{size_download}B\n' $HOST/og-image.png
curl -s -o /dev/null -w '/ (protected) -> %{http_code} -> %{redirect_url}\n' $HOST/
```

Expect: `Welcome to Glyph` + `Glyph — Turn Articles into Visual Infographics`, `/og-image.png` returning `200 image/png 34898`, and `/` `307`-redirecting to `/login`.

## Pre-merge vs post-merge testing pattern

Until a PR is merged into the live branch, the deployed app shows the **old** code while local shows the new code. To prove a rename or UI change is doing real work, run the same `curl` / browser check against both:

- Local (PR branch via `npm run dev`): should reflect the change.
- Live deployed: should still show the old behavior — proves the test discriminates.

After merge, wait for Railway `SUCCESS` and re-run the live smoke check to confirm the change reached production.

## Secrets / access I had

- `RAILWAY_API_TOKEN` — already in env on this VM; sufficient for everything in this skill.
- Did **not** have: a Google OAuth test account, so end-to-end Google sign-in could not be fully exercised. Anything past the `/api/auth/signin` redirect requires the user's account or a session-only test secret.
- Did **not** have: real `OPENAI_API_KEY` / `EXA_API_KEY`. Deck generation could not be tested end-to-end.

## Known repo quirks

- `package.json` name is `glyph` (was `temp-next-app` historically). Don't rename it without checking Railway / vercel-style integrations that may key on it.
- Lint is clean except 3 pre-existing `@next/next/no-img-element` warnings on `<img>` usage — these are unrelated to most changes and shouldn't be "fixed" as part of an unrelated PR.
- No GitHub Actions CI on this repo. Railway auto-deploy is the only CI, and it only runs against the live branch *after* merge — meaning a broken commit on a PR branch won't be caught by anything except local testing.
- No tests in the repo. Don't go looking for a test runner.
