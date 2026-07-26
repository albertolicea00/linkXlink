# Link x Link — Design

Architecture and design decisions. Living doc — update when decisions change.

## 1. High-level architecture

```
Browser (PWA)
  └── React SPA (Vite)
        ├── react-router: / , /es , /en , /app , /account , /register ,
        │                 /admin , /admin/moderator , /admin/config ,
        │                 /eula , /privacy , /data
        ├── i18n (es default, en)
        ├── config/: app-config (behavior) + app-links (URLs) + dev-config (admin flags)
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
  config/       app-config.json, app-links.json, dev-config.json
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
- Site URL lives in `app-links.json` (`site_url`) AND hardcoded in `index.html`,
  `robots.txt`, `sitemap.xml` — update all four when the domain changes

## 8. Open items / to verify

- Supabase project not yet provisioned — migrations written in `supabase/migrations/`, need MCP or dashboard to apply
- Domain: SEO files use `https://linkxlink.vercel.app` (index.html, robots.txt, sitemap.xml, app-links.json) — update all four if the domain changes
- Rate-limiting report spam: basic client throttle only; server-side needs Edge Function (future)
- Dev flags (`lib/devFlags.ts`) are client-side localStorage, not a security boundary — a savvy user could view fake seed data. Acceptable for test data; if fakes ever hold sensitive info, gate `is_fake` server-side.
- Deny quorum vs report auto-disable are two independent disable paths (`denied_at` vs `report_count >= threshold`) — keep them distinct when reasoning about "why is this profile off".

## 9. Moderation quorum, seed claiming & dev flags

- **Quorum** (migration 0012, `moderate_profile` RPC): approve/deny apply on one admin vote OR N distinct moderator votes (`app.settings.approve_quorum` / `deny_quorum`, mirrored in config). Votes are idempotent (unique partial index on `moderation_actions`). Deny stores a text reason from the config pick-list. The moderator deck treats every swipe as skip; approve/deny are buttons that pass `SwipeMeta` through `SwipeDeck`.
- **Seed + claim** (migration 0013): launch feed seeded via `supabase/seed.sql` with `migrated = true`, ownerless, active rows. Registering with a matching number claims the row (`claim_migrated_profile`) instead of hitting the duplicate-number error. `seed_profiles_visible_before_claim` controls feed visibility of unclaimed seed rows.
- **Ownership claims** (migration 0014): a duplicate number owned by a non-seed profile lets the registrant file `ownership_claims` via `claim_ownership` ("Es mío"). Recorded only; moderators reassign manually if warranted.
- **Dev flags** replaced the old global `test_mode`: `showFakes`, `bypassRelease`, `onlyMigratedUnclaimed`, `showMigratedStat`, per-device in localStorage, toggled from the admin-only floating `</>` panel (`DevFlagsFab`, mounted app-wide).
- **Two kill switches** in `dev-config.json`, both all-or-nothing for admins:
  - `show_app_settings_to_admins` — the config route (the env keyword path) and
    the banner linking to it from the admin dashboard. Off → the banner is gone
    AND the route redirects to the admin dashboard, so there is no way in.
  - `show_dev_settings_to_admins` — the `</>` dev-flags panel. Off → the button
    is gone AND `getDevFlags()` purges the stored flags, so a device that had
    them on reverts to normal behavior instead of staying silently altered.
    Hiding the UI alone would have left that stale state in place forever.
- **Planned: per-email allowlists.** Two future arrays in `dev-config.json`
  (`app_settings_admin_emails`, `dev_settings_admin_emails`) that narrow each
  switch from "every admin" to "these admins". Semantics: the boolean stays the
  master switch — `false` means nobody, `true` + a non-empty list means only
  those emails, `true` + empty list means every admin (today's behavior). The
  two lists are independent but the dev-settings one is only meaningful when
  app-settings access is also granted. Deliberately NOT implemented yet: the
  keys would be dead config, which is exactly how the two booleans above sat
  unread in the repo until this change.

## 9.1. Staff routes

The staff area is three independent routes with fixed paths, declared in
`src/lib/adminPath.ts`:

| Constant         | Path                | Who              | Content                                     |
| ---------------- | ------------------- | ---------------- | ------------------------------------------- |
| `ADMIN_PATH`     | `/admin`            | admin            | global stats + staff management             |
| `MODERATOR_PATH` | `/admin/moderator`  | moderator, admin | personal stats + share + approve/deny deck  |
| `CONFIG_PATH`    | `/admin/config`     | admin            | read-only viewer for the three config JSONs |

Two things changed here, both removals:

- They were previously ONE route split by a `?view=admin|moderator` query.
  Splitting them means deep links, nav active state, page titles and the role
  check all key off the URL rather than a param the router doesn't own.
- `VITE_ADMIN_PATH` (a build-env "secret" path) is gone. `VITE_` vars are
  inlined into the bundle, so the path was readable by anyone who opened the
  JS — it deterred casual URL guessing only, and in exchange every environment
  had to carry a matching env var. The boundary always was the staff login +
  RLS, so the obscurity bought nothing worth its cost.

`src/pages/admin/StaffGate.tsx` holds the shared session/role gate so the three
route components stay thin; `requires: 'admin' | 'staff'` is the only
difference between them.

The config viewer is read-only on purpose — editing means a redeploy today.
It renders each value by shape (booleans as ON/OFF pills, URLs as links, arrays
of primitives as chips, arrays of objects as numbered cards) and has one search
box filtering keys and values across all three files. Live editing is designed
in issue #8 (Supabase-backed remote config).
