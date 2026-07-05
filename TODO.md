# Link x Link — TODO

Tracking checklist derived from `plan/plan.md`. Check items off as they land.

## 0. Project setup

- [x] Complete `.gitignore` (node, vite, env, supabase, OS files)
- [x] `plan/TODO.md` (this file)
- [x] `CLAUDE.md` (project instructions for AI sessions)
- [x] `DESIGN.md` (architecture + UI design decisions)
- [x] Scaffold Vite + React + TypeScript app
- [x] Base folder structure (`src/pages`, `src/components`, `src/lib`, `src/config`, `src/i18n`)
- [x] `.env.example` with Supabase vars

## 1. Routing

- [x] `/` landing page route
- [x] `/app` main app route
- [x] `/eula` terms & conditions route
- [x] `/privacy` privacy policy route
- [x] `/admin` admin route (minimal)
- [x] 404 fallback

## 2. i18n

- [x] i18n setup (es default, en available)
- [x] Translation JSON files (`es.json`, `en.json`)
- [x] Language switcher in UI
- [x] All UI texts translatable (no hardcoded strings)

## 3. Landing page (`/`)

- [x] Title `Link x Link`
- [x] Short service description
- [x] CTA button to enter `/app`
- [x] Benefits section (local profiles, fast WhatsApp contact, report filtering)
- [x] "How to use" section
- [x] Links to `/eula` and `/privacy`

## 4. Main app (`/app`)

- [x] Fetch active profiles from Supabase
- [x] Profile card component: name, short description, 1-3 photos
- [x] Photo carousel inside card (1-3 images)
- [x] `Open WhatsApp` button (`https://wa.me/<number>`)
- [x] `Report` button
- [x] Horizontal swipe / lateral navigation between profiles (Tinder-like)
- [x] Profile state handling: active / disabled
- [x] Disabled profiles hidden from main view (RLS + active filter)
- [x] Swap counter (localStorage, rolling 24h window)
- [x] Max swaps limit configurable (default 100 / 24h)
- [x] Warning alert at threshold (default 40-50 swaps)
- [x] WhatsApp ban-risk warning message
- [x] Loading / empty / error states

## 5. Reports

- [x] Report form: reason + optional comment
- [x] Report reasons: link does not exist, wrong number, fraudulent profile
- [x] Store report in Supabase (`reports` table)
- [x] Increment `report_count` on profile (DB trigger)
- [x] Auto-disable profile at threshold (default 3 reports)
- [x] Confirmation message after submitting report
- [x] Reported/disabled profile no longer shown

## 6. Data model (Supabase)

- [x] SQL migration: `profiles` table (id, name, description, whatsapp, photos, active, report_count, created_at, disabled_at)
- [x] SQL migration: `reports` table (id, profile_id, reason, comment, created_at)
- [x] SQL migration: `admins` table (optional: id, email, role, created_at)
- [x] RPC/trigger: increment report_count + auto-disable at threshold
- [x] RLS: public read of active profiles only
- [x] RLS: public insert of reports
- [x] RLS: `report_count` / `active` updates controlled (not public)
- [x] RLS: admin operations require auth
- [x] Storage bucket for profile photos (public URLs)
- [ ] Apply migration to real Supabase project (needs MCP or dashboard)

## 7. Supabase integration (frontend)

- [x] `@supabase/supabase-js` client setup (env vars)
- [x] Profiles read query (active only)
- [x] Report insert call
- [x] WhatsApp number sanitization before rendering link

## 8. Config / parameters

- [x] JSON config file in repo (`src/config/app-config.json`)
- [x] `max_swaps_per_24h` (100)
- [x] `warning_swap_threshold` (40)
- [x] `whatsapp_ban_warning` (message key in i18n)
- [x] `report_threshold` (3)
- [x] `default_language` (`es`)
- [x] Config loaded by frontend at runtime

## 9. Admin (minimal)

- [x] `/admin` page with Supabase Auth login
- [x] Form to create profile (name, description, whatsapp, photos upload)
- [x] Basic data validation
- [x] Photo upload to Supabase Storage
- [x] List profiles with status
- [x] Reactivate disabled profile

## 10. PWA

- [x] `vite-plugin-pwa` setup
- [x] `manifest.json`: name, short_name, start_url, display, background_color, theme_color
- [x] App icons (installation, Android)
- [x] Service worker: asset caching
- [x] Basic offline mode (cache last visited profiles)
- [ ] Install prompt works on Android/mobile (verify on deployed domain)

## 11. UX / responsive

- [x] Mobile-first responsive design
- [x] Cards with spacing and large buttons
- [x] Small and medium screens supported
- [x] Legal pages content (EULA, privacy) in es/en

## 12. Security

- [x] Validate profile data before saving (admin + DB checks)
- [x] Sanitize `whatsapp` field (digits only, country code)
- [x] Report spam control (basic: localStorage duplicate guard per device)
- [x] Configurable admin route via `VITE_ADMIN_PATH` (hides URL; auth + RLS remain the real protection)

## 13. Deploy

- [x] Production build passes
- [ ] Deploy config (Vercel/Netlify)
- [ ] PWA verified on deployed domain

## 14. Self-registration

- [x] `/register` route + page (name, description, whatsapp, photos)
- [x] Terms/privacy/data acceptance required before submitting
- [x] Share gate: user must share the app link with N people on WhatsApp (`required_shares_to_register`, default 3) — client-side counter (localStorage), counts taps, not verified sends
- [x] Migration `0002_self_registration.sql`: public insert of profiles forced to `active = false` (pending), public photo upload, bucket size/mime limits
- [x] Self-registered profiles land as pending; admin activates them from the panel (existing reactivate button)
- [x] "Create my profile" button next to "Enter" on the landing
- [x] Field help texts (what other people will see on the card)
- [x] Phone input with country selector + flag, validated with libphonenumber-js, stored as digits with country code
- [x] Birthdate field with 18+ check (client-side only; deliberately not stored — profile rows are publicly readable)
- [x] Client-side image optimization before upload (resize to 1280px max, WebP with JPEG fallback)
- [x] Unique index on `whatsapp` (one profile per number, friendly duplicate error)
- [ ] Apply migration 0002 to real Supabase project

## 15. Registration security gaps (known — future work)

- [ ] Require registration before entering `/app` to swipe (gate the feed for unregistered devices)
- [ ] No way to know if a device/person already registered — needs user accounts or phone verification
- [ ] Anyone can register someone else's number — needs WhatsApp OTP / verification deep link
- [ ] Share gate is a client-side tap counter — bypassable; replace with verified referrals (`?ref=<code>`)
- [ ] Age check is declarative (client-side birthdate) — not verifiable
- [ ] Public photo upload can be abused outside the form — rate limit via Edge Function if abused
- [ ] EULA/privacy texts should state the 18+ requirement explicitly

## 16. Swipe deck v2, rotation & metrics

- [x] Real Tinder-style gestures (pointer drag, rotation, fly-out, card stack, keyboard arrows)
- [x] Moderation deck in admin: same card, swipe/buttons Skip (left) / Approve (right) with drag stamps
- [x] Rotation: per-device least-seen-first ordering + shuffle (`rotation_least_seen_first`)
- [x] Preload photos of next N profiles (`preload_profiles_ahead`, default 3)
- [x] Swipe threshold parametrizable (`swipe_threshold_px`)
- [x] Metrics migration `0003_metrics.sql`: `profile_events` (view / whatsapp_click per anonymous device) + `moderation_actions` (who approved/skipped/banned whom)
- [x] Track views + WhatsApp clicks from the app (flags `track_views`, `track_whatsapp_clicks`)
- [x] Language toggle (pill style) in app and admin headers
- [x] Profile deep link `/app?profile=<uuid>` (dev feature; kill switch `deep_link_profiles_enabled`)
- [x] Deck counter hidden behind `show_deck_counter`; local stats bar (swipes/clicks today) behind `show_deck_stats`
- [x] Branded fallback images for photo-less profiles (5 gradient variants, TikTok 1080x1920, stable per profile id)
- [ ] Apply migration 0003 to real Supabase project
- [ ] Live admin-panel toggles (deep link, tracking) — needs public-readable `app.settings` or an RPC; today they are build-time config
- [ ] Metrics dashboard in admin (views/clicks per profile, actions per moderator)
- [ ] Server-side rotation (balance exposure across all devices, not just per device)
- [ ] `profile_events` public insert can be spammed — rate limit / Edge Function if abused

## 17. User authentication

- [x] Supabase Auth for end users: Google / Apple / Facebook (OAuth) + email+password (`auth_providers` config)
- [x] Migration `0004_user_auth.sql`: `owner_id` on profiles (unique — one profile per account), insert requires signed-in owner, owners read own pending profile, photo upload requires auth
- [x] Register as 3-step wizard: 1) account → 2) share gate → 3) profile form
- [x] Soft gate on `/app`: blocking popup (not redirect) to log in, then to create profile (`require_auth_for_app`, `require_profile_for_app`)
- [x] Already-registered detection (own profile pending/active screens)
- [x] `moderators` table separate from `admins` (migration `0005_moderators.sql`): moderation-only rights via `is_moderator()`; admins unchanged
- [x] Admin panel role gate: session alone is not enough — plain users get "not authorized" (needed now that users share Supabase Auth)
- [ ] Apply migrations 0004 + 0005 to real Supabase project
- [ ] Enable Google/Apple/Facebook providers in Supabase Dashboard (each needs OAuth app credentials + redirect URL)
- [ ] Password reset flow for users (supabase.auth.resetPasswordForEmail + /reset page)
- [ ] Hide admin-only sections from moderators in the panel UI (today RLS blocks the data; UI shows empty stats)

## Future (out of MVP scope)

- [ ] Referral validation: per-profile referral code in the shared link (`?ref=<code>`), track who joined through whose link, count only verified joins toward the share gate (replaces the localStorage tap counter)
- [ ] Referral stats in admin (who invited whom, conversion)
- [ ] Filters by category or zone
- [ ] Internal chat
- [ ] More link types beyond WhatsApp
- [ ] Detailed profile page
- [ ] Report stats and moderation dashboard
