# Link x Link — Design

Architecture and design decisions. Living doc — update when decisions change.

## 1. High-level architecture

```
Browser (PWA)
  └── React SPA (Vite)
        ├── react-router: / , /es , /en , /app , /admin , /eula , /privacy
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
| Landing lang routes | `/es`, `/en` render Landing with forced language | Shareable/indexable language URLs; `/` keeps auto-detect |
| Theme | Light/dark via CSS variables + `data-theme` on `<html>` | System preference on first visit, manual toggle persisted in localStorage; inline script in `index.html` avoids flash |
| Typography | Fredoka (variable 300-700), self-hosted woff2 | Same look for every user and offline-capable (PWA); generic `fantasy` keyword rejected — resolves differently per browser |
| Terms gate | Checkbox on landing; `/app` redirects to `/` without acceptance | localStorage (not sessionStorage — would re-ask every tab), stores `LEGAL_LAST_UPDATED` so changing legal text forces re-acceptance |

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
                LanguageSwitcher, ThemeToggle, WarningBanner
  lib/          supabase.ts, whatsapp.ts (sanitize/format), swapCounter.ts,
                reports.ts, theme.ts, legal.ts
  hooks/        useProfiles, useSwapCounter, usePageMeta
  config/       app-config.json
  i18n/         index.ts, es.json, en.json
```

## 5. Branding & UI

### Palette — pink

| Token | Light | Dark |
|---|---|---|
| `--color-primary` | `#ec4899` | `#f472b6` |
| `--color-primary-dark` | `#db2777` | `#ec4899` |
| `--color-bg` | `#fdf6f9` (pink-tinted) | `#17121a` |
| `--color-surface` | `#ffffff` | `#221a24` |
| `--color-text` | `#271c22` | `#f6f0f4` |
| `--color-border` | `#f0dde7` | `#3a2d38` |
| Hero gradient | `#ec4899 → #fb7185` | same |

WhatsApp button keeps brand green (`#25d366`) — recognizability beats palette purity.
The word "WhatsApp" in landing copy is highlighted in primary pink via `<wa>` markup in
i18n strings rendered with `<Trans>`.

Brand mark: white heart on pink gradient (`public/icons/icon.svg`), exported to
192/512 PNG for the manifest and `og.png` (1200x630) for link previews.

### Typography

Fredoka variable (300-700), self-hosted in `public/fonts/` (latin + latin-ext for
Spanish diacritics), `font-display: swap`, preloaded in `index.html`. Fallback stack:
system-ui sans.

### UX

- Mobile-first. Cards fill viewport width minus padding; large touch targets (≥44px)
- Light/dark theme: toggle in every header; first visit follows system preference
- Swipe horizontal between profiles (touch events + buttons for desktop)
- Card: photo carousel top, name + description, two buttons: WhatsApp (primary, green), Report (secondary, subtle)
- Swap counter: warning banner at `warning_swap_threshold` (40) with WhatsApp ban-risk message; hard stop at `max_swaps_per_24h` (100)
- Report: modal with radio reasons + optional comment; confirmation toast on submit
- Disabled profiles: excluded from feed (RLS already hides them)
- Landing: gradient hero with glow, benefit cards with pink outline SVG icons, numbered steps
- Legal pages show a "last updated" date (`LEGAL_LAST_UPDATED` in `src/lib/legal.ts` — bump on text changes)

## 6. PWA

- `vite-plugin-pwa`, `registerType: autoUpdate`
- Manifest: name "Link x Link", display standalone, theme color `#ec4899`
- Precache app shell (incl. fonts); runtime cache: Supabase REST GET (StaleWhileRevalidate) + Storage images (CacheFirst) → basic offline with last-seen profiles

## 7. SEO

SPA, no SSR — metadata is set client-side; Googlebot executes JS and picks it up.

- Static head in `index.html` (Spanish defaults): title, description, canonical,
  hreflang (`es`/`en`/`x-default`), Open Graph + Twitter cards (WhatsApp shares show
  `og.png` preview), JSON-LD `WebApplication`
- Per-route metadata via `usePageMeta` hook: title, description, canonical, `html lang`,
  `noindex` for `/admin` and 404
- `public/robots.txt` (disallow `/admin`) and `public/sitemap.xml` with hreflang alternates
- Site URL lives in `app-config.json` (`site_url`) AND hardcoded in `index.html`,
  `robots.txt`, `sitemap.xml` — update all four when the domain changes

## 8. Open items / to verify

- Supabase project not yet provisioned — migrations written in `supabase/migrations/`, need MCP or dashboard to apply
- Domain: SEO files use `https://linkxlink.vercel.app` (index.html, robots.txt, sitemap.xml, app-config.json) — update all four if the domain changes
- Rate-limiting report spam: basic client throttle only; server-side needs Edge Function (future)
