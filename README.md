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
