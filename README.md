# Jewellery.photo

Turn one jewellery photo into a premium, catalog-grade photograph. Members upload a
phone photo of a piece, pick a jewellery type and a style, and receive a styled image.
An admin portal manages styles (designs + AI prompts), jewellery types, users and credits.

## Stack

- `frontend/` — React (Vite), luxury editorial design, member studio + admin portal
- `backend/` — Node.js (Express) + Prisma + PostgreSQL
- `docker-compose.yml` — db + backend + frontend (nginx), one command deploy

## Run with Docker (recommended)

```bash
cp .env.example .env   # fill DB_PASSWORD, JWT_SECRET, ADMIN_PASSWORD
docker compose up --build
```

Open http://localhost:8080 — sign in with the admin credentials from `.env`.

## Local development

```bash
# terminal 1: backend (needs a Postgres + backend/.env, see backend/.env.example)
cd backend && npm install && npx prisma db push && npm run seed && npm run dev
# terminal 2: frontend
cd frontend && npm install && npm run dev
```

Frontend dev server proxies `/api` to `localhost:8081`.

## AI generation

Generation runs through a provider adapter (`backend/src/services/provider.js`):

- **Demo (default, `mock`)** — produces a clearly labelled DEMO PREVIEW composite of the
  uploaded piece. Free, no external calls, and never presented as real AI output.
- **Google Gemini** — real AI image generation. Enable it either in Admin → Settings
  (provider + model + API key, stored server-side and never returned by the API) or with
  the `AI_PROVIDER` / `AI_API_KEY` / `AI_MODEL` environment variables.

## Credits

One credit = one finished image; credits are only spent on successful generations.
New members get `FREE_CREDITS` on sign up. Admins top up credits in Admin → Users.

## Admin portal

`/admin` — dashboard, styles & prompt templates (with preview images), jewellery types,
user management (credits, roles, disable), generation log, AI provider settings.

## Security model

- **No default credentials.** The seed creates an admin only when `ADMIN_EMAIL` and
  `ADMIN_PASSWORD` (min 10 chars) are both set; otherwise it skips with a warning.
  `docker-compose.yml` requires `ADMIN_PASSWORD` to be set.
- Passwords are bcrypt-hashed; sessions are 30-day JWTs; disabled accounts are rejected
  at login and on every authenticated request.
- Uploads and generated outputs are private per member: file reads check generation
  ownership (admin excepted). Style previews are the only public files.
- Uploads are limited to 15MB JPG/PNG/WebP and are re-validated as real images server-side.
- Credits are spent atomically at submit (race-safe) and automatically refunded when a
  generation fails. New members get `FREE_CREDITS`; registration can never set a role.
- The AI provider API key is write-only in Admin → Settings and is never returned by the API.

## Planned integrations (config-gated, not yet active)

These need the owner's own external accounts and are intentionally inert until configured:

- **Google sign-in** — implemented end to end and config-gated: with `GOOGLE_CLIENT_ID`
  set, the frontend renders the Google button (loaded from `/api/auth/config`) and the
  backend verifies the Google ID token server-side against Google's keys with the client
  id as audience, then creates the account by verified email. Without
  `GOOGLE_CLIENT_ID` the route fails closed with 501 and the button never renders.
  Account-linking policy: a Google identity is never silently merged into an existing
  password account on an email match alone (password-account emails are unverified).
  If the email exists, sign-in returns 409 `LINK_REQUIRED`; the member signs in with
  their password and links Google explicitly via `POST /api/auth/google/link`, which
  requires the verified Google email to match the account email.
- **Paid credit top-ups (Razorpay)** — implemented and config-gated. With
  `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` set, `POST /api/payments/topup` creates a real
  gateway order (`PRICE_PER_CREDIT_INR` sets pricing), `POST /api/payments/verify`
  validates the checkout HMAC signature, and `POST /api/payments/webhook` validates the
  raw-body webhook signature (`RAZORPAY_WEBHOOK_SECRET`). Settlement is idempotent:
  a paid order credits exactly once whether confirmed by callback, webhook, or replays.
  Every balance change lands in the auditable credit ledger (`CreditTransaction`:
  signup grant, admin adjustment, generation spend, failure refund, top-up purchase;
  members read their own at `GET /api/auth/ledger`). Without gateway keys every payment
  route fails closed with 501 and nothing can charge. Live payment end-to-end remains
  unverified until the owner's real Razorpay account exists.
- **Tests** — `cd backend && NODE_ENV=test node --test test/integrations.test.js` runs
  the boundary suite against a mocked Google verifier and mocked Razorpay order API:
  forged-token rejection, new-account creation, linking policy (409, explicit link,
  email mismatch), order creation, signature acceptance/rejection, idempotent double
  settlement, webhook signature + replay, ledger invariant, and the unconfigured
  fail-closed path.
