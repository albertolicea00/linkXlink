# Link x Link

PWA for local users: browse people profiles (photos, name, description) with a direct WhatsApp link. Tinder-like horizontal card navigation. Users can report broken/incorrect profiles; profiles auto-disable after a report threshold.

## Stack

- Frontend: Vite + React + TypeScript, single app (no monorepo — one app, shared packages not justified yet)
- Routing: react-router
- Backend: Supabase (Postgres, Storage, Auth for admin)
- PWA: vite-plugin-pwa
- i18n: es (default) + en, JSON translation files in `src/i18n/`

## Conventions

- Code, identifiers, comments, commit messages: English
- UI texts: never hardcoded — always through i18n keys (es/en)
- Commits: Conventional Commits, short subject, no co-author, no AI attribution
- System parameters live in `src/config/app-config.json` (report threshold, swap limits, etc.) — change behavior there, not with magic numbers

## Key docs

- `DESIGN.md` — architecture and design decisions
- `plan/TODO.md` — full checklist; check items off as they land
- `supabase/migrations/` — SQL schema, RLS, triggers (source of truth for DB)

## Commands

- `npm run dev` — dev server
- `npm run build` — production build (also typechecks)
- `npm run preview` — preview production build

## Environment

- `.env.local` (gitignored): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- `.env.example` documents required vars

## Domain rules

- Profile disabled when `report_count >= report_threshold` (default 3) — enforced by DB trigger, not client
- Only active profiles are publicly readable (RLS)
- WhatsApp numbers stored digits-only with country code; rendered as `https://wa.me/<number>`
- Swap counter is client-side (localStorage, rolling 24h window) — soft limit, warns user about WhatsApp ban risk
