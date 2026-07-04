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
- [ ] Apply migration 0002 to real Supabase project

## Future (out of MVP scope)

- [ ] Referral validation: per-profile referral code in the shared link (`?ref=<code>`), track who joined through whose link, count only verified joins toward the share gate (replaces the localStorage tap counter)
- [ ] Referral stats in admin (who invited whom, conversion)
- [ ] Filters by category or zone
- [ ] Internal chat
- [ ] More link types beyond WhatsApp
- [ ] Detailed profile page
- [ ] Report stats and moderation dashboard
