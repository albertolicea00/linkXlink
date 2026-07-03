# Link x Link — Design

Architecture and design decisions. Living doc — update when decisions change.

## 1. High-level architecture

```
Browser (PWA)
  └── React SPA (Vite)
        ├── react-router: / , /app , /admin , /eula , /privacy
        ├── i18n (es default, en)
        ├── app-config.json (runtime parameters)
        └── @supabase/supabase-js
              ├── Postgres (profiles, reports, admins)
              ├── Storage (profile photos)
              └── Auth (admin only)
```

No custom backend server. Business logic lives in:
- **DB triggers** (report counting, auto-disable) — trusted path
- **RLS policies** — access control
- **Client** — only UX logic (swap counter, warnings)

## 2. Decisions

| Decision | Choice | Why |
|---|---|---|
| Monorepo (plan §5.1) | **No — single Vite app** | One app, no shared packages; monorepo adds overhead with zero benefit now. Revisit if a second app appears. |
| Framework | React + Vite + TS | Plan-recommended, best PWA plugin support |
| Report counting | Postgres trigger on `reports` insert | Client can't be trusted to increment `report_count`; trigger is atomic and enforces threshold server-side |
| Public writes | Only `reports` insert | Everything else via admin auth |
| Photos | Supabase Storage, public bucket | Simplicity; profiles are public anyway |
| Swap limit | localStorage, client-side | Soft UX guard, not security; no user accounts exist |
| i18n lib | react-i18next | De-facto standard, JSON files as plan requires |
| Config | Static JSON imported at build, in repo | Plan §5.5: versioned, editable via git; admin editing is a future extension |

## 3. Data model

```sql
profiles: id uuid pk, name text, description text, whatsapp text (digits only),
          photos jsonb (array of storage URLs), active bool default true,
          report_count int default 0, created_at timestamptz, disabled_at timestamptz null

reports:  id uuid pk, profile_id uuid fk -> profiles, reason text,
          comment text null, created_at timestamptz

admins:   id uuid pk (= auth.users.id), email text, role text, created_at timestamptz
```

Trigger `on_report_inserted`: `report_count = report_count + 1`; if
`report_count >= report_threshold` → `active = false, disabled_at = now()`.
Threshold mirrored in `app-config.json` for UI text; DB value is authoritative.

### RLS

- `profiles`: SELECT public where `active = true`; INSERT/UPDATE/DELETE only admins
- `reports`: INSERT public; SELECT only admins
- `admins`: only self-read via auth

## 4. Frontend structure

```
src/
  pages/        Landing, App, Admin, Eula, Privacy, NotFound
  components/   ProfileCard, PhotoCarousel, ReportModal, SwipeDeck,
                LanguageSwitcher, WarningBanner
  lib/          supabase.ts, whatsapp.ts (sanitize/format), swapCounter.ts
  hooks/        useProfiles, useSwapCounter
  config/       app-config.json
  i18n/         index.ts, es.json, en.json
```

## 5. UX

- Mobile-first. Cards fill viewport width minus padding; large touch targets (≥44px)
- Swipe horizontal between profiles (touch events + buttons for desktop)
- Card: photo carousel top, name + description, two buttons: WhatsApp (primary, green), Report (secondary, subtle)
- Swap counter: warning banner at `warning_swap_threshold` (40) with WhatsApp ban-risk message; hard stop at `max_swaps_per_24h` (100)
- Report: modal with radio reasons + optional comment; confirmation toast on submit
- Disabled profiles: excluded from feed (RLS already hides them)

## 6. PWA

- `vite-plugin-pwa`, `registerType: autoUpdate`
- Manifest: name "Link x Link", display standalone, theme color brand
- Precache app shell; runtime cache: Supabase REST GET (StaleWhileRevalidate) + Storage images (CacheFirst) → basic offline with last-seen profiles

## 7. Open items / to verify

- Supabase project not yet provisioned — migrations written in `supabase/migrations/`, need MCP or dashboard to apply
- Icons: placeholder generated set until brand assets exist
- Rate-limiting report spam: basic client throttle only; server-side needs Edge Function (future)
