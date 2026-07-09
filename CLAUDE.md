# Link x Link

PWA for local users: browse people profiles (photos, name, description) with a direct WhatsApp link. Tinder-style swipe deck (drag gestures, card stack, fly-out). Users self-register (account → share gate → profile) and land pending until a moderator approves them. Reported profiles auto-disable at a threshold.

## Stack

- Frontend: Vite + React + TypeScript, single app (no monorepo — one app, shared packages not justified yet)
- Routing: react-router
- Backend: Supabase (Postgres, Storage, Auth), + a Supabase Edge Function (`supabase/functions/sync-brevo-contact/`) syncing completed profiles to a Brevo email list via a Database Webhook — server-side only, never exposes the Brevo API key to the client. See `SETUP.md` §C.
- Auth: Supabase Auth for everyone — end users (OAuth Google/Facebook/Apple + email+password) and staff (email+password on the admin route)
- Phone validation: `libphonenumber-js/max` (full per-country patterns; `min` metadata is not precise enough)
- PWA: vite-plugin-pwa (autoUpdate SW; runtime caching: Supabase REST StaleWhileRevalidate, Storage images CacheFirst)
- i18n: es (default) + en, JSON translation files in `src/i18n/`

## Conventions

- Code, identifiers, comments, commit messages: English
- UI texts: never hardcoded — always through i18n keys (es/en)
- Commits: Conventional Commits, short subject, no co-author, no AI attribution
- **Branching**: The `main` branch is for stable releases only. All feature work and pull requests MUST target the `beta` branch.
- System parameters live in `src/config/app-config.json` — change behavior there, not with magic numbers. Includes: report/swap/click limits, share gate size, swipe threshold, preload count, rotation, tracking flags, deep link kill switch, `auth_providers`, app gate toggles, preview count, deck counter/stats/undo visibility, fallback image variants, `telegram_url`, `gender_options`, `interest_options`, `max_interests`, `show_age`, `moderation_approve_quorum`, `moderation_deny_quorum`, `moderation_deny_reasons`, `seed_profiles_visible_before_claim`, `whatsapp_prefill_enabled`. Quorum thresholds are ALSO stored authoritatively in `app.settings` (`approve_quorum` / `deny_quorum`); config mirrors them for UI, the `moderate_profile` RPC enforces the DB copy.
- `test_mode` was removed. Fake-profile viewing, release-gate bypass, and the unclaimed-migrated view are now per-device admin dev flags (`src/lib/devFlags.ts`, localStorage), toggled from a panel in `/account` that only admins see. All off = normal app. NOT a security boundary (the `is_fake` filter is client-side).

## Auth & roles

- End users: any `auth.users` account; own at most ONE profile (`profiles.owner_id`, unique index). Self-registered profiles always insert with `active = false` (RLS-enforced) and wait for approval. Users edit their own profile only via the `update_own_profile` RPC (whitelisted columns — cannot self-approve). `/account` = self-management: read-only summary by default, "Edit profile" reveals the editable form (name, bio, gender, interests, visibility hide/pause). Also carries a Telegram community banner.
- Community/support: single Telegram channel (`telegram_url` in app-config) doubles as bug reports, feature requests and customer service for now. Shown as a banner on `/account` and as step 6 on the landing.
- `admins` table: full power (`is_admin()`), manages moderators, reads metrics. First admin created by hand (Supabase Auth user + row in `admins`); thereafter admins promote users from the panel.
- `moderators` table: moderation only (`is_moderator()` = moderator or admin) — sees pending profiles, approves (update), writes/reads `moderation_actions`. Admins promote/demote both moderators AND other admins from the panel (`search_users` RPC finds accounts by email; each promote/remove is confirm-gated; an admin can't remove themselves — self-lockout guard). RLS for `admins` insert/delete/full-read is migration 0020 — before that, new admins could only be added by hand via SQL.
- Admin panel code is modular: `src/pages/Admin.tsx` is a thin role/session gate rendering `src/pages/admin/AdminDashboard.tsx` or `ModeratorDashboard.tsx`. Shared bits live in `src/pages/admin/` (`AdminsManager` — search/promote/remove staff with confirm dialogs, `DenyReasonModal`, `LoginForm`) and `src/components/` (`StatCard`, `ConfirmModal`). `src/hooks/useAdminProfiles.ts` holds the profiles-fetch + derived counts shared by both dashboards. `ModeratorsManager.tsx` is AdminsManager's mod-only predecessor, kept unused intentionally (not deleted) as reference.
- Admin panel is ONE route (`VITE_ADMIN_PATH`, default `/admin`) with TWO role-based views: admins see global stats + moderator management (no share/deck) and can toggle to the moderator view; moderators see approved-by-me/pending/banned stats + share + the approve/skip deck. Admin IS a moderator; a moderator is NOT an admin. The path is baked into the bundle — hides the URL, NOT a security boundary. A plain user session gets "not authorized" (role checked against both tables + RLS).
- Shared `NavBar` (bottom bar on mobile, floating pill top-right on desktop) on /app, /account, /admin (NOT landing). Items by role via `useNavState`: admin → account/admin/moderator/app; moderator → account/moderator/app/share; user → account/app/share; signed out → app/share. Landing has its own role-aware CTAs instead (enter + moderate if staff + my-profile/create-profile). Admin nav items link to `?view=admin|moderator` (panel reads the query).
- `/app` gate: server-enforced (migration 0006 — `has_own_profile()`), with a soft popup on top. Signed-out / profile-less visitors get a preview of N profiles (`preview_profiles` RPC, whatsapp hidden) before the gate triggers. Toggles: `require_auth_for_app`, `require_profile_for_app`, `preview_profiles_count` (0 = gate immediately).

## Key docs

- `DESIGN.md` — architecture and design decisions
- `TODO.md` — full checklist (incl. known security gaps); check items off as they land
- `SETUP.md` — Supabase + Vercel step-by-step (migrations, providers, staff creation)
- `supabase/migrations/` — SQL schema, RLS, triggers (source of truth for DB). Apply in numeric order 0001 → 0020. Convention: every table carries `created_at` + `updated_at` (updated_at auto-stamped by the shared `set_updated_at()` BEFORE UPDATE trigger, migration 0016) — new tables must add both + the trigger. `supabase/seed.sql` (service-role, run once) bootstraps the launch feed with migrated/claimable people.
- `RULES.md` — community & moderation policy (content rules, approve/deny quorum, deny reasons, seed claiming, ownership claims)
- `ROLES.md` — capability matrix + detail per role (visitor, user with/without profile, moderator, admin)

## Commands

- `npm run dev` — dev server
- `npm run build` — production build (also typechecks)
- `npm run preview` — preview production build

## Environment

- `.env.local` (gitignored): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, optional `VITE_ADMIN_PATH`
- `.env.example` documents required vars

## Domain rules

- Profile disabled when `report_count >= report_threshold` (default 3) — enforced by DB trigger, not client
- Reading the feed is server-gated (migration 0006): active profiles are readable only by a signed-in user who owns a profile (`has_own_profile()`) or a moderator/admin. The `/app` popup is UX only — the real gate is RLS. Owners always read their own pending profile. NOTE: photos live in a public storage bucket, so image URLs remain publicly fetchable even though profile rows are gated.
- Moderation is quorum-gated (migration 0012, `moderate_profile` RPC): approve or deny applies when one admin votes OR N distinct moderators agree (N = `approve_quorum` / `deny_quorum`). Deny requires a text reason (picked from `moderation_deny_reasons`, stored in `moderation_actions.reason`); denied profiles get `denied_at` set and leave the pending queue. In the moderator deck a swipe is ALWAYS a skip — approve/deny are explicit buttons only (see `SwipeMeta` in `SwipeDeck`).
- One profile per WhatsApp number and per account (unique indexes); duplicate insert → Postgres 23505 → friendly i18n error. EXCEPTION: seed rows (migration 0013, `migrated = true`, ownerless) are claimable — registering with the matching number calls `claim_migrated_profile` to assign the row to the caller (their submitted fields overwrite the placeholders; the seed stays active). If the number is owned by a non-seed profile, the registrant can file an ownership claim ("Es mío") via `claim_ownership` → `ownership_claims` (migration 0014); moderators review, NO auto-reassignment. Denying an UNCLAIMED migrated profile (`migrated=true, owner_id is null`) deletes the row outright instead of soft-denying it (migration 0017) — a seed row has no real person behind it, and a permanent denied stub would squat the WhatsApp number forever.
- Admin view shows global counters (fake profiles, migrated total/unclaimed, accounts with no profile) via the `admin_stats()` RPC (migration 0018) — always true DB-wide totals, deliberately independent of dev flags or the panel's own filtered profiles query. Moderator view shows a personal stats row (approved/denied by me via `my_approved_count()`/`my_denied_count()`, pending count, and "skipped today" — the last is a local-only per-device counter, `src/lib/moderatorSkips.ts`, not persisted server-side).
- WhatsApp numbers stored digits-only with country code (E.164 without `+`); rendered as `https://wa.me/<number>`
- Registration wizard: 1) account 2) share app link N times (client-side tap counter — bypassable, future referral validation) 3) profile form (name, bio, birthdate, gender, interested-in, interests, phone, photos; real-time validation, 18+ check)
- Profile extras: `gender` (male/female/other), `interested_in` (male/female/both — stored but NOT used to filter yet), `birthdate` stored to display age (UI shows age, never the raw date), `interests` (tags from `interest_options`, capped at `max_interests`), `region` (free-text state/province; the COUNTRY is derived from the phone's country code, so no per-country list), `self_hidden` / `hidden_until` user-controlled visibility (feed policy + preview RPC both respect them)
- Self-edit (`update_own_profile` RPC) now also covers `region` and `photos` — replacing a photo is a direct change with NO re-moderation (revisit if abused). Still cannot touch active/report_count/owner_id/whatsapp/birthdate.
- WhatsApp deep link prefills a default message (`feed.whatsappMessage` i18n, `{{name}}` interpolated) via `wa.me/<n>?text=...`, gated by `whatsapp_prefill_enabled`.
- Photos: client-optimized before upload (≤1280px, WebP/JPEG), 10 MB client cap, 5 MB + mime whitelist enforced by the bucket
- Swap/click counters are client-side (localStorage, rolling 24h window) — soft limits, warn about WhatsApp ban risk
- Deck rotation is per-device (localStorage least-seen-first + shuffle); metrics events (`profile_events`: view / whatsapp_click per anonymous device id) and the moderation audit (`moderation_actions`: who approved/skipped/banned whom) live in the DB
