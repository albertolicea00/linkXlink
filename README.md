# Link x Link

PWA to browse local people profiles and contact them directly through WhatsApp. Tinder-like horizontal card navigation, community reporting, automatic disabling of reported profiles.

Built with Vite + React + TypeScript and Supabase.

## Features

- Profile cards with photos (1-3), name, description
- Direct WhatsApp link (`wa.me`)
- Horizontal swipe navigation between profiles
- Report system: profiles auto-disable after 3 reports (DB trigger)
- Swap limit with WhatsApp ban-risk warnings (client-side, rolling 24h)
- i18n: Spanish (default) and English
- Installable PWA with basic offline support
- Minimal admin panel (`/admin`) to create and reactivate profiles

## Routes

| Route | Purpose |
|---|---|
| `/` | Landing page |
| `/app` | Main app (profile feed) |
| `/admin` | Admin panel (Supabase Auth) |
| `/eula` | Terms and conditions |
| `/privacy` | Privacy policy |

## Development

```bash
npm install
cp .env.example .env.local   # fill in Supabase credentials
npm run dev
```

## Supabase setup

1. Create a Supabase project.
2. Apply `supabase/migrations/0001_init.sql` (SQL editor or `supabase db push`).
3. Create an admin user in Auth, then insert its id/email into `public.admins`.
4. Copy the project URL and anon key into `.env.local`.

## Configuration

System parameters live in `src/config/app-config.json` (swap limits, report threshold, languages). The report threshold is also stored in `app.settings` in the database — the DB value is the authoritative one.

## Docs

- `DESIGN.md` — architecture and design decisions
- `CLAUDE.md` — project conventions
