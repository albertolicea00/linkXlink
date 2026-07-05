# Link x Link

PWA for local users: browse people profiles (photos, name, description) with a direct WhatsApp link. Tinder-style swipe deck (drag gestures, card stack, fly-out). Users self-register (account → share gate → profile) and land pending until a moderator approves them. Reported profiles auto-disable at a threshold.

## Stack

- Frontend: Vite + React + TypeScript, single app (no monorepo — one app, shared packages not justified yet)
- Routing: react-router
- Backend: Supabase (Postgres, Storage, Auth)
- Auth: Supabase Auth for everyone — end users (OAuth Google/Facebook/Apple + email+password) and staff (email+password on the admin route)
- Phone validation: `libphonenumber-js/max` (full per-country patterns; `min` metadata is not precise enough)
- PWA: vite-plugin-pwa (autoUpdate SW; runtime caching: Supabase REST StaleWhileRevalidate, Storage images CacheFirst)
- i18n: es (default) + en, JSON translation files in `src/i18n/`

## Conventions

- Code, identifiers, comments, commit messages: English
- UI texts: never hardcoded — always through i18n keys (es/en)
- Commits: Conventional Commits, short subject, no co-author, no AI attribution
- System parameters live in `src/config/app-config.json` — change behavior there, not with magic numbers. Includes: report/swap/click limits, share gate size, swipe threshold, preload count, rotation, tracking flags, deep link kill switch, `auth_providers`, app gate toggles, deck counter/stats/undo visibility, fallback image variants.

## Auth & roles

- End users: any `auth.users` account; own at most ONE profile (`profiles.owner_id`, unique index). Self-registered profiles always insert with `active = false` (RLS-enforced) and wait for approval.
- `admins` table: full power (`is_admin()`), manages moderators, reads metrics. Created by hand: Supabase Auth user + row in `admins`.
- `moderators` table: moderation only (`is_moderator()` = moderator or admin) — sees pending profiles, approves (update), writes/reads `moderation_actions`. Same hand-created flow, row in `moderators`.
- Admin panel route is env-configurable (`VITE_ADMIN_PATH`, default `/admin`); baked into the bundle at build time — hides the URL, is NOT a security boundary. A plain user session gets "not authorized" there (role checked against both tables).
- `/app` has a soft gate: blocking popup (not a redirect) asking to log in, then to create a profile. Toggles: `require_auth_for_app`, `require_profile_for_app`.

## Key docs

- `DESIGN.md` — architecture and design decisions
- `TODO.md` — full checklist (incl. known security gaps); check items off as they land
- `SETUP.md` — Supabase + Vercel step-by-step (migrations, providers, staff creation)
- `supabase/migrations/` — SQL schema, RLS, triggers (source of truth for DB). Apply in numeric order 0001 → 0005.

## Commands

- `npm run dev` — dev server
- `npm run build` — production build (also typechecks)
- `npm run preview` — preview production build

## Environment

- `.env.local` (gitignored): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, optional `VITE_ADMIN_PATH`
- `.env.example` documents required vars

## Domain rules

- Profile disabled when `report_count >= report_threshold` (default 3) — enforced by DB trigger, not client
- Only active profiles are publicly readable (RLS); owners read their own pending profile; moderators/admins read all
- One profile per WhatsApp number and per account (unique indexes); duplicate insert → Postgres 23505 → friendly i18n error
- WhatsApp numbers stored digits-only with country code (E.164 without `+`); rendered as `https://wa.me/<number>`
- Registration wizard: 1) account 2) share app link N times (client-side tap counter — bypassable, future referral validation) 3) profile form (real-time validation, 18+ birthdate check client-side only and never stored — profile rows are public)
- Photos: client-optimized before upload (≤1280px, WebP/JPEG), 10 MB client cap, 5 MB + mime whitelist enforced by the bucket
- Swap/click counters are client-side (localStorage, rolling 24h window) — soft limits, warn about WhatsApp ban risk
- Deck rotation is per-device (localStorage least-seen-first + shuffle); metrics events (`profile_events`: view / whatsapp_click per anonymous device id) and the moderation audit (`moderation_actions`: who approved/skipped/banned whom) live in the DB
