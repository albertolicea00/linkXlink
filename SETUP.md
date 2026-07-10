# Setup Guide 🛠️

Step-by-step to get Link x Link running — from Supabase to production on Vercel.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [A. Supabase (backend)](#a-supabase-backend)
- [B. Vercel (deploy)](#b-vercel-deploy)
- [C. Brevo email sync (optional)](#c-brevo-email-sync-optional)

---

## Prerequisites

- Node.js >= 20
- A [GitHub](https://github.com) account
- A [Supabase](https://supabase.com) account (free tier)
- A [Vercel](https://vercel.com) account (free tier)
- This repo cloned locally:
  ```bash
  git clone https://github.com/albertolicea00/linkxlink
  cd linkxlink
  ```

---

## A. Supabase (backend)

### 1. Create a project

- Go to <https://supabase.com>
- **Start a project** → pick the closest region, set a strong DB password, free tier is fine.
- Wait for the database to provision (~1–2 min).

### 2. Run the migrations (in order)

- Dashboard → **SQL Editor**
- Paste and **Run** each file from `supabase/migrations/`, in numeric order:

| File | What it creates |
|---|---|
| `0001_init.sql` | `profiles`, `reports`, `admins`, `profile-photos` bucket, RLS, auto-disable trigger |
| `0002_self_registration.sql` | Public self-registration (pending profiles), unique WhatsApp index, bucket size/mime limits |
| `0003_metrics.sql` | `profile_events` (views / WhatsApp clicks) + `moderation_actions` (audit trail) |
| `0004_user_auth.sql` | `profiles.owner_id` (one profile per account), registration requires a signed-in user |
| `0005_moderators.sql` | `moderators` table + `is_moderator()`; moderation policies extended to moderators |
| `0006_app_access.sql` | Server-side `/app` gate: reading active profiles requires a signed-in user with their own profile (or a moderator) |
| `0007_preview.sql` | `preview_profiles()` RPC — anonymous teaser of N profiles (no whatsapp exposed) |
| `0008_moderator_mgmt.sql` | `search_users()` + `my_approved_count()` RPCs for the admin panel |
| `0009_profile_fields.sql` | Profile fields (gender, interested_in, birthdate, interests, hide/pause) + `update_own_profile()` self-edit RPC |
| `0010_more_genders.sql` | Expanded gender options in database check constraints |
| `0011_test_profiles.sql` | Adds `is_fake` column and test mode support to `preview_profiles()` RPC |
| `0012_moderation_quorum.sql` | Quorum-gated approve/deny (`moderate_profile` RPC), deny `reason`, `profiles.denied_at`, `approve_quorum`/`deny_quorum` settings |
| `0013_seed_migration.sql` | `profiles.migrated` + `claim_migrated_profile()` RPC (phone-based claim of seed rows) |
| `0014_ownership_claims.sql` | `ownership_claims` table + `claim_ownership()` RPC ("it's mine", moderator-reviewed) |
| `0015_region_and_photo_edit.sql` | `profiles.region` + `update_own_profile()` extended with region/photos + `claim_migrated_profile()` region arg |
| `0016_timestamps.sql` | `updated_at` on every table + shared `set_updated_at()` trigger; `created_at`/`updated_at` added to `app.settings` |
| `0017_deny_deletes_unclaimed_migrated.sql` | `moderate_profile()`: denying an unclaimed migrated (seed) profile deletes the row instead of soft-denying it, freeing the WhatsApp number |
| `0018_admin_stats.sql` | `admin_stats()` RPC — global counters (fake profiles, migrated total/unclaimed, accounts with no profile), always DB-wide regardless of dev flags |
| `0019_my_denied_count.sql` | `my_denied_count()` RPC — mirrors `my_approved_count()` for the moderator's "Denied by me" stat |
| `0020_admin_management.sql` | RLS: admins can read the full `admins` list and insert/delete rows — promoting/demoting other admins from the panel (previously SQL-editor only) |

Optionally, after the migrations, seed the launch feed: edit `supabase/seed.sql`
with real people and run it **with the service role** (it inserts ownerless,
`migrated = true` rows that their owners later claim by phone).

### 3. Verify the schema

- **Table Editor** → confirm `profiles`, `reports`, `admins`, `moderators`, `profile_events`, `moderation_actions` exist
- **Storage** → confirm `profile-photos` bucket (should be public)

### 4. Create the first admin

The first admin must be created by hand (Supabase Auth user + row in `admins`). After that, admins can promote any registered user to **moderator** from the panel — no SQL needed.

- **Authentication → Users → Add user** (email + password, enable auto-confirm)
- Copy the generated **UUID**
- **SQL Editor** → run:
  ```sql
  insert into public.admins (id, email)
  values ('<copied-uuid>', '<email>');
  ```

> Need a moderator by hand too? Same flow, `insert into public.moderators (id, email) values (...)`. Normally you'd just use the panel's **Admin → Moderators** search instead.
> An account with no row in either table gets "not authorized" on the admin panel, even with a valid login — regular app users share the same Supabase Auth.

**Roles:** `admins` = full power (global stats, manage moderators; can switch to the moderator view). `moderators` = approve/skip pending profiles + their own stats (approved-by-me / pending / banned) + share the app. Admin **is** a moderator; a moderator is **not** an admin.

### Create a normal end user (optional)

A "normal user" is nothing special: just an `auth.users` account with **no row** in `admins` or `moderators`. Role is decided purely by table membership — no row = regular user, row in `moderators` = moderator, row in `admins` = admin. All three share the same Supabase Auth.

Two ways to get one:

- **The real path (self sign-up):** open `/app` (or `/register`) and sign up with OAuth/email. The account is a plain user immediately; they then create their one profile through the wizard. This is how actual users join — nothing manual on your side.
- **By hand (for testing):** **Authentication → Users → Add user** (email + password, enable auto-confirm). Do **not** insert into `admins`/`moderators`. Log in through the app — the account can create one profile, swipe, and report, but the admin path shows "not authorized".

> To later promote this user to moderator, use the panel: **Admin → Moderators** search, or `insert into public.moderators (id, email) values (...)`.

### 5. Enable auth providers (end users)

End users sign up with OAuth and/or email — buttons shown come from `auth_providers` in `src/config/app-config.json`.

- **Authentication → Providers**:
  - **Email** works out of the box. Decide on **Confirm email** (Auth → Settings): if ON, users must confirm before the session starts (the UI tells them to check their inbox).
  - **Google** — needs an OAuth client in Google Cloud Console.
  - **Facebook** — needs an app in Meta for Developers.
  - **Apple** — needs a (paid) Apple Developer account. Skip it by removing `"apple"` from `auth_providers`.
- **Authentication → URL Configuration**: add `http://localhost:5173` and your production domain to **Redirect URLs** (OAuth returns the user to the page they started on). The password-reset email links to `<origin>/reset-password`, so make sure that path is covered (a domain-level entry or a `/**` wildcard is enough).

> Deploying before OAuth credentials are ready? Set `"auth_providers": []` — email login still works.

### 6. Get your API credentials

- **Settings → API**
- Copy **Project URL** and **anon public key**

### 7. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in:

```
VITE_SUPABASE_URL=<your-project-url>
VITE_SUPABASE_ANON_KEY=<your-anon-key>
# Optional: secret path for the admin panel (defaults to /admin)
VITE_ADMIN_PATH=/my-secret-admin
```

> The anon key is **public by design** — security comes from RLS, not key secrecy.
> `VITE_ADMIN_PATH` only hides the admin URL from casual visitors — it ships inside the JS bundle. Real protection is the staff login + RLS.

### 8. Test locally

```bash
npm install     # if you haven't yet
npm run dev
```

Walk through:

- [ ] Open `/app` → auth gate popup appears → create a user account (email or OAuth)
- [ ] Profile gate appears → "Create my profile" → wizard: share 3 times → fill the profile form → submitted as pending
- [ ] Login at the admin path with a moderator/admin → the pending profile shows in the moderation deck → swipe right / **Approve**
- [ ] The profile now appears in the feed at `/app`
- [ ] Report it 3 times (from 3 different browsers/incognito sessions — same browser blocks duplicates) → profile must disappear from feed

---

## B. Vercel (deploy)

### 1. Push to GitHub

```bash
git remote add origin <your-repo-url>
git push -u origin main
```

### 2. Import project

- Go to <https://vercel.com>
- **Add New → Project**
- Import your GitHub repository

### 3. Build settings

Vercel auto-detects Vite. Verify the defaults:

| Setting | Value |
|---|---|
| Framework preset | Vite |
| Build command | `npm run build` |
| Output directory | `dist` |

### 4. Environment variables

**Before deploying**, expand **Environment Variables** and add:

| Key | Value |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon public key |
| `VITE_ADMIN_PATH` | (optional) Secret admin panel path, e.g. `/my-secret-admin` |

> After deploying, add the production URL to Supabase **Authentication → URL Configuration → Redirect URLs**, or OAuth logins will bounce.

### 5. Deploy

- Click **Deploy**
- Wait for the green build ✅

### 6. SPA fallback

After deploy, go to your project **Settings → Git** and add a `vercel.json` at repo root for SPA routing:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Or add it now in the repo before pushing — Vercel will pick it up automatically.

### 7. Verify on `*.vercel.app`

- [ ] `/app` loads profiles from Supabase
- [ ] Direct routes work (e.g. open `/eula` directly — SPA rewrite must work)
- [ ] WhatsApp button opens `wa.me/<number>`

### 8. PWA on mobile

- Open the Vercel URL in Android/Chrome
- **Add to Home Screen**
- Verify it opens standalone and works with basic offline support (after first visit)

### 9. Custom domain (optional)

- Go to **Project → Settings → Domains** in Vercel dashboard
- Add your domain and follow DNS instructions

---

## C. Brevo email sync (optional)

Every user who completes their profile has already accepted the mandatory
terms checkbox at account creation, which bundles in consent to receive email
updates (see `landing.acceptTerms` — the checkbox text says so explicitly).
`supabase/functions/sync-brevo-contact/` upserts that user as a Brevo contact
whenever their profile is created or updated. The sync runs **server-side
only** (Database Webhook → Edge Function → Brevo) — the Brevo API key is
never exposed to the browser.

### 1. Get your Brevo API key and list ID

- Brevo dashboard → **Settings → SMTP & API → API Keys** → copy your key.
- **Contacts → Lists** → open the target list → note its numeric ID (visible
  in the URL, or via the Brevo API).

### 2. Configure Secrets and Deploy the Edge Function

**Option A: Via Supabase Dashboard (Recommended)**
1. Go to your Supabase project dashboard.
2. Navigate to **Edge Functions** (left sidebar) → **Secrets**.
3. Click **Add new secret** and add two secrets:
   - `BREVO_API_KEY`: `<your-brevo-api-key>`
   - `BREVO_LIST_ID`: `<your-list-id>`
4. Deploy the function using the [Supabase CLI](https://supabase.com/docs/guides/cli) (make sure you are logged in and linked with `supabase link`):
   ```bash
   supabase functions deploy sync-brevo-contact
   ```

**Option B: Via Supabase CLI**
Requires the Supabase CLI logged in and linked to this project.
```bash
supabase secrets set BREVO_API_KEY=<your-brevo-api-key>
supabase secrets set BREVO_LIST_ID=<your-list-id>
supabase functions deploy sync-brevo-contact
```

### 3. Wire the Database Webhook

- Supabase Dashboard → **Integrations** → **Webhooks** → **Create a new webhook**
- Table: `profiles` — Events: **Insert** and **Update**
- Type: **Supabase Edge Functions** — select `sync-brevo-contact`
- Save.

### 4. Test

- Complete a profile in the app (or update an existing one).
- Check **Brevo → Contacts** — the email should appear on the list within a
  few seconds, with `NAME`, `WHATSAPP`, and `REGION` attributes set.
- If it doesn't show up, check **Supabase Dashboard → Edge Functions →
  sync-brevo-contact → Logs** for the error (commonly a wrong list ID, or the
  webhook firing before the profile row is fully committed — rare).

> Seed/migrated profiles (`owner_id IS NULL`) are skipped until claimed — no
> email exists to sync yet. Once claimed, the same row triggers an UPDATE and
> gets synced normally.
>
> Not implemented: removing a contact from Brevo when a profile is deleted or
> denied. Add a webhook on `DELETE` calling Brevo's contact-delete endpoint if
> that's needed later.

---

## Notes

- **Env var changes** on Vercel require redeployment: **Deployments → Redeploy**
- The **Telegram community link** (`telegram_url` in `src/config/app-config.json`) is where bug reports, feature requests and support go for now — point it at your own channel.
- The **report threshold** lives in two places — update **both** if you change it:
  - `app.settings` in the Supabase database (authoritative)
  - `src/config/app-config.json` in the codebase (UI display)


- **Roles recap**: `admins` = everything (incl. managing moderators and reading metrics). `moderators` = only approve/skip pending profiles. Regular users = swipe and own one profile. All three share the same Supabase Auth; the tables decide the role.

