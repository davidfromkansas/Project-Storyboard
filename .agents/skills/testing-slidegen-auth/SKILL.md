---
name: testing-slidegen-auth
description: Test the SlideGen Google OAuth auth flow end-to-end. Use when verifying auth changes on the Railway deployment.
---

# Testing SlideGen Auth Flow

## Overview
SlideGen uses manual Google OAuth (not next-auth) with JWT sessions via `jose`. The app is deployed on Railway.

## Live URL
https://project-storyboard-production.up.railway.app

## Testable Without Google 2FA

These tests can be run without completing Google sign-in (which requires the user's physical device):

1. **Route protection**: `GET /` without session cookie should return 307 redirect to `/login`
2. **Login page UI**: Verify heading ("Welcome to SlideGen"), subtitle, "Continue with Google" button linking to `/api/auth/signin`, footer text
3. **OAuth redirect parameters** (CRITICAL): Click "Continue with Google" and verify the Google URL contains:
   - Correct `client_id` (should match Google Cloud Console)
   - `redirect_uri` pointing to the Railway production URL (NOT `localhost:3000` — this was a previous bug)
   - `scope=openid+profile+email`
   - `response_type=code`
   - Non-empty `state` parameter (64 hex chars)
   - Google shows "Choose an account" with no error
4. **API auth enforcement**: `curl -H "Cookie: session_token=fake" .../api/cost` should return 401
5. **Session endpoint**: `curl .../api/auth/session` without cookie should return 401 with `{"user":null}`

## Requires User's Physical Device
- Completing Google sign-in (passkey/2FA step)
- Verifying landing page shows user email + sign-out button
- Testing sign-out clears session
- Testing session persistence across page refreshes

## Key Architecture Notes
- Auth routes: `/api/auth/signin` (generates CSRF state + redirects to Google), `/api/auth/callback/google` (exchanges code for tokens), `/api/auth/signout` (clears cookie), `/api/auth/session` (returns current user)
- Session cookie: `session_token`, httpOnly, secure, 30-day expiry, JWT signed with `AUTH_SECRET`
- The `redirect_uri` is always constructed from `AUTH_URL` env var (not `request.url`) to bypass Railway's reverse proxy reporting `localhost:3000`
- Edge middleware in `src/middleware.ts` checks for `session_token` cookie existence; API routes do server-side JWT validation via `getSession()`

## Common Issues
- If OAuth fails with `error=token_exchange`, check that `GOOGLE_CLIENT_SECRET` in Railway is valid. Test directly: `curl -X POST https://oauth2.googleapis.com/token -d 'client_id=...&client_secret=...&grant_type=authorization_code&...'`
- If `redirect_uri` contains `localhost`, ensure `AUTH_URL` env var is set correctly on Railway
- The session cookie is httpOnly so it can't be cleared via browser console JS. Use the `/api/auth/signout` POST endpoint or the UI "Sign out" button

## Devin Secrets Needed
- `GOOGLE_CLIENT_ID` — Google OAuth Client ID
- `GOOGLE_CLIENT_SECRET` — Google OAuth Client Secret
- Railway access via browser login (Continue with GitHub)
